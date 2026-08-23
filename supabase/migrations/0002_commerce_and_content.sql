-- ============================================================================
-- 0002 — Affiliate commerce, editorial content and the audit trail.
-- ============================================================================

create type article_type as enum ('buying_guide', 'alternatives', 'learn', 'gear', 'news');
create type audit_action as enum ('insert', 'update', 'delete', 'publish', 'unpublish');

-- ------------------------------------------------------------- retailers ----

create table retailers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  network text,
  is_active boolean not null default false,
  disclosure_note text,
  -- Tracking parameters appended at redirect time. Never a full URL.
  tracking_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger retailers_updated_at
  before update on retailers
  for each row execute function set_updated_at();

alter table retailers enable row level security;

-- ------------------------------------------------------ bottle_retailers ----

-- The server-side allowlist behind /go/{merchant}/{bottle}. A redirect
-- destination must exist as a row here; user-supplied URLs are never followed.
create table bottle_retailers (
  id uuid primary key default gen_random_uuid(),
  bottle_id uuid not null references bottles (id) on delete cascade,
  retailer_id uuid not null references retailers (id) on delete cascade,
  destination_url text not null,
  is_active boolean not null default true,

  -- Reserved for future verified pricing. Null means "we do not claim to know".
  verified_price_cents integer,
  price_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bottle_retailers_unique unique (bottle_id, retailer_id),
  constraint bottle_retailers_https check (destination_url ~* '^https://'),
  constraint bottle_retailers_price_positive
    check (verified_price_cents is null or verified_price_cents > 0),
  constraint bottle_retailers_price_dated
    check (verified_price_cents is null or price_verified_at is not null)
);

create index bottle_retailers_bottle_idx on bottle_retailers (bottle_id) where is_active;

create trigger bottle_retailers_updated_at
  before update on bottle_retailers
  for each row execute function set_updated_at();

alter table bottle_retailers enable row level security;

-- -------------------------------------------------------------- articles ----

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  article_type article_type not null,
  excerpt text,
  body text,
  methodology text,
  status publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  constraint articles_published_at_present
    check (status <> 'published' or published_at is not null)
);

create index articles_type_status_idx on articles (article_type, status);

create trigger articles_updated_at
  before update on articles
  for each row execute function set_updated_at();

alter table articles enable row level security;

-- ----------------------------------------------------------- guide_items ----

-- Joins a guide to canonical bottle records. Bottle facts are never copied
-- here: only the guide-specific rank, label and rationale.
create table guide_items (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  bottle_id uuid not null references bottles (id) on delete restrict,
  rank smallint not null default 1,
  label text,
  rationale text,
  created_at timestamptz not null default now(),
  constraint guide_items_unique unique (article_id, bottle_id)
);

create index guide_items_article_idx on guide_items (article_id, rank);

alter table guide_items enable row level security;

-- ------------------------------------------------------ affiliate_clicks ----

-- Deliberately minimal: no IP address, no user agent, no identifier that could
-- be tied back to a person.
create table affiliate_clicks (
  id bigint generated always as identity primary key,
  retailer_id uuid references retailers (id) on delete set null,
  bottle_id uuid references bottles (id) on delete set null,
  article_id uuid references articles (id) on delete set null,
  origin_path text,
  created_at timestamptz not null default now()
);

create index affiliate_clicks_created_idx on affiliate_clicks (created_at desc);

alter table affiliate_clicks enable row level security;

-- ------------------------------------------------------------- audit_log ----

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  entity_table text not null,
  entity_id uuid,
  action audit_action not null,
  changed_fields text[],
  change jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_table, entity_id, created_at desc);

alter table audit_log enable row level security;

-- Records meaningful editorial, pricing-threshold and publishing changes.
-- Attached only to the tables where an audit trail is required by policy.
create or replace function record_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action audit_action;
  v_changed text[];
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_entity_id := new.id;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_entity_id := old.id;
  else
    select array_agg(key)
      into v_changed
      from jsonb_each(to_jsonb(new))
      where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key
        and key not in ('updated_at');

    if v_changed is null then
      return new;
    end if;

    v_entity_id := new.id;

    -- Publishing transitions are called out so they are easy to audit.
    if to_jsonb(new) ? 'status' and to_jsonb(new) ->> 'status' is distinct from to_jsonb(old) ->> 'status' then
      v_action := case
        when to_jsonb(new) ->> 'status' = 'published' then 'publish'::audit_action
        when to_jsonb(old) ->> 'status' = 'published' then 'unpublish'::audit_action
        else 'update'::audit_action
      end;
    else
      v_action := 'update';
    end if;
  end if;

  insert into audit_log (actor_id, entity_table, entity_id, action, changed_fields, change)
  values (
    auth.uid(),
    tg_table_name,
    v_entity_id,
    v_action,
    v_changed,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger bottles_audit
  after insert or update or delete on bottles
  for each row execute function record_audit();

create trigger articles_audit
  after insert or update or delete on articles
  for each row execute function record_audit();

create trigger retailers_audit
  after insert or update or delete on retailers
  for each row execute function record_audit();

-- bottle_prices is keyed by bottle_id rather than id, so it needs its own
-- trigger function to report the right entity id.
create or replace function record_price_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(key)
      into v_changed
      from jsonb_each(to_jsonb(new))
      where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key
        and key not in ('updated_at');

    if v_changed is null then
      return new;
    end if;
  end if;

  insert into audit_log (actor_id, entity_table, entity_id, action, changed_fields, change)
  values (
    auth.uid(),
    'bottle_prices',
    coalesce(new.bottle_id, old.bottle_id),
    lower(tg_op)::audit_action,
    v_changed,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger bottle_prices_audit
  after insert or update or delete on bottle_prices
  for each row execute function record_price_audit();
