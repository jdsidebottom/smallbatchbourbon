-- ============================================================================
-- 0001 — Core schema: enums, admin roles, brands, bottles, pricing, reviews.
--
-- Every table is created with RLS enabled and no policies. Policies are added
-- explicitly in 0003_rls_policies.sql, so the default for any table added here
-- and forgotten there is "nobody can read or write it".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

create type publication_status as enum ('draft', 'review', 'published', 'archived');
create type admin_role as enum ('admin', 'editor', 'contributor');
create type verdict_band as enum ('steal', 'buy', 'fair', 'maybe', 'walk_away');
create type mash_bill_status as enum ('disclosed', 'partial', 'undisclosed');
create type bottle_relationship_type as enum ('alternative', 'similar', 'upgrade', 'budget_pick');
create type source_type as enum (
  'producer',
  'ttb_label',
  'retailer',
  'press',
  'distillery_visit',
  'first_party_tasting',
  'other'
);

-- ------------------------------------------------------------ utilities ----

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------- admin users ----

-- Authorization data lives in the database, not in JWT claims a client could
-- influence. Server-side guards read this table on every admin request.
create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role admin_role not null default 'contributor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_users_updated_at
  before update on admin_users
  for each row execute function set_updated_at();

alter table admin_users enable row level security;

-- security definer so the check itself is not subject to RLS on admin_users.
create or replace function is_active_admin(min_role admin_role default 'contributor')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from admin_users au
    where au.user_id = auth.uid()
      and au.is_active
      and case min_role
            when 'contributor' then true
            when 'editor' then au.role in ('admin', 'editor')
            when 'admin' then au.role = 'admin'
          end
  );
$$;

-- ---------------------------------------------------------------- brands ----

create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_company text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger brands_updated_at
  before update on brands
  for each row execute function set_updated_at();

alter table brands enable row level security;

-- --------------------------------------------------------------- bottles ----

create table bottles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand_id uuid not null references brands (id) on delete restrict,
  name text not null,
  classification text,

  -- Proof and ABV are related but both recorded as printed on the label.
  proof numeric(5, 2),
  abv numeric(5, 2),

  -- Age is either a stated number of years or explicitly no age statement.
  -- "unknown" is never implied: has_age_statement false means NAS on the label.
  has_age_statement boolean not null default false,
  age_years numeric(4, 1),

  mash_bill_status mash_bill_status not null default 'undisclosed',
  mash_bill_details text,

  producer text,
  actual_distiller text,

  description text,
  image_path text,
  image_alt text,

  status publication_status not null default 'draft',
  published_at timestamptz,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bottles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint bottles_proof_range check (proof is null or (proof > 0 and proof <= 200)),
  constraint bottles_abv_range check (abv is null or (abv > 0 and abv <= 100)),
  constraint bottles_age_requires_statement
    check (age_years is null or has_age_statement),
  constraint bottles_age_range check (age_years is null or age_years > 0),
  -- A published bottle must carry a publication timestamp.
  constraint bottles_published_at_present
    check (status <> 'published' or published_at is not null),
  -- An image that is shown must have alt text.
  constraint bottles_image_alt_present
    check (image_path is null or image_alt is not null)
);

create index bottles_brand_id_idx on bottles (brand_id);
create index bottles_status_idx on bottles (status);
create index bottles_published_idx on bottles (published_at desc) where status = 'published';

create trigger bottles_updated_at
  before update on bottles
  for each row execute function set_updated_at();

alter table bottles enable row level security;

-- --------------------------------------------------------- bottle prices ----

-- Reference price plus the editorial What We'd Pay thresholds. Kept in a
-- separate table from bottles so a price/threshold revision is an isolated,
-- auditable change.
create table bottle_prices (
  bottle_id uuid primary key references bottles (id) on delete cascade,

  -- Money is stored in integer cents. Never floats.
  msrp_cents integer,
  currency char(3) not null default 'USD',
  msrp_source_url text,
  msrp_source_note text,
  msrp_verified_at date,

  -- Band ceilings. A shelf price at or below a ceiling earns that verdict;
  -- anything above maybe_max_cents is Walk Away.
  steal_max_cents integer not null,
  buy_max_cents integer not null,
  fair_max_cents integer not null,
  maybe_max_cents integer not null,

  editorial_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bottle_prices_msrp_positive check (msrp_cents is null or msrp_cents > 0),
  constraint bottle_prices_bands_positive check (steal_max_cents > 0),
  constraint bottle_prices_bands_ordered check (
    steal_max_cents <= buy_max_cents
    and buy_max_cents <= fair_max_cents
    and fair_max_cents <= maybe_max_cents
  ),
  -- A verified MSRP must say where it came from.
  constraint bottle_prices_msrp_sourced check (
    msrp_cents is null
    or (msrp_verified_at is not null and (msrp_source_url is not null or msrp_source_note is not null))
  )
);

create trigger bottle_prices_updated_at
  before update on bottle_prices
  for each row execute function set_updated_at();

alter table bottle_prices enable row level security;

-- The single source of truth for turning a shelf price into a verdict. Used by
-- Liquor Store Mode, bottle pages and buying guides alike.
create or replace function evaluate_verdict(
  shelf_price_cents integer,
  steal_max_cents integer,
  buy_max_cents integer,
  fair_max_cents integer,
  maybe_max_cents integer
)
returns verdict_band
language sql
immutable
as $$
  select case
    when shelf_price_cents is null then null
    when shelf_price_cents <= steal_max_cents then 'steal'::verdict_band
    when shelf_price_cents <= buy_max_cents then 'buy'::verdict_band
    when shelf_price_cents <= fair_max_cents then 'fair'::verdict_band
    when shelf_price_cents <= maybe_max_cents then 'maybe'::verdict_band
    else 'walk_away'::verdict_band
  end;
$$;

-- ------------------------------------------------------ tasting profiles ----

-- Structured flavour axes, 0-10. Drives "find similar" and profile indicators.
create table tasting_profiles (
  bottle_id uuid primary key references bottles (id) on delete cascade,
  sweetness smallint,
  oak smallint,
  spice smallint,
  fruit smallint,
  vanilla smallint,
  caramel smallint,
  richness smallint,
  heat smallint,
  finish smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasting_profiles_ranges check (
    coalesce(sweetness, 0) between 0 and 10
    and coalesce(oak, 0) between 0 and 10
    and coalesce(spice, 0) between 0 and 10
    and coalesce(fruit, 0) between 0 and 10
    and coalesce(vanilla, 0) between 0 and 10
    and coalesce(caramel, 0) between 0 and 10
    and coalesce(richness, 0) between 0 and 10
    and coalesce(heat, 0) between 0 and 10
    and coalesce(finish, 0) between 0 and 10
  )
);

create trigger tasting_profiles_updated_at
  before update on tasting_profiles
  for each row execute function set_updated_at();

alter table tasting_profiles enable row level security;

-- --------------------------------------------------------------- reviews ----

create table reviews (
  bottle_id uuid primary key references bottles (id) on delete cascade,
  quick_take text,
  nose text,
  palate text,
  finish text,
  overall text,
  best_for text,
  skip_if text,
  sample_provided boolean not null default false,
  reviewed_at date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_updated_at
  before update on reviews
  for each row execute function set_updated_at();

alter table reviews enable row level security;

-- -------------------------------------------------- bottle relationships ----

create table bottle_relationships (
  id uuid primary key default gen_random_uuid(),
  source_bottle_id uuid not null references bottles (id) on delete cascade,
  target_bottle_id uuid not null references bottles (id) on delete cascade,
  relationship_type bottle_relationship_type not null default 'alternative',
  rank smallint not null default 1,
  note text,
  created_at timestamptz not null default now(),
  constraint bottle_relationships_no_self check (source_bottle_id <> target_bottle_id),
  constraint bottle_relationships_unique unique (source_bottle_id, target_bottle_id, relationship_type)
);

create index bottle_relationships_source_idx
  on bottle_relationships (source_bottle_id, relationship_type, rank);

alter table bottle_relationships enable row level security;

-- --------------------------------------------------------------- sources ----

-- Provenance for any fact on any record. Editorial-internal: never exposed to
-- anonymous readers, because notes may include unpublished context.
create table sources (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id uuid not null,
  field_name text,
  source_type source_type not null default 'other',
  url text,
  title text,
  verified_at date not null default current_date,
  internal_notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sources_entity_table_allowed
    check (entity_table in ('bottles', 'bottle_prices', 'reviews', 'articles', 'brands'))
);

create index sources_entity_idx on sources (entity_table, entity_id);

alter table sources enable row level security;
