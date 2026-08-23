-- ============================================================================
-- Demo seed — LOCAL AND PREVIEW ONLY.
--
-- Every bottle here is fictional. It exists to exercise the bottle page,
-- alternatives, search and the affiliate redirect without inventing facts,
-- prices or verdicts for a real product, which the PRD forbids.
--
-- Do not run this against production. To remove it:
--   psql "$DATABASE_URL" -f supabase/seed/demo_bottle_teardown.sql
-- ============================================================================

insert into brands (slug, name, parent_company)
values ('example-distilling', 'Example Distilling', 'Example Beverage Group')
on conflict (slug) do nothing;

insert into brands (slug, name)
values ('sample-creek', 'Sample Creek')
on conflict (slug) do nothing;

-- ------------------------------------------------------------ the bottle ----

insert into bottles (
  slug, brand_id, name, classification, proof, abv,
  has_age_statement, age_years, mash_bill_status, mash_bill_details,
  producer, actual_distiller, description, status, published_at
)
select
  'example-bourbon-small-batch',
  b.id,
  'Example Bourbon Small Batch',
  'Kentucky Straight Bourbon · Small Batch',
  100, 50,
  true, 6,
  'disclosed', '75% corn, 13% rye, 12% malted barley',
  'Example Distilling',
  null,
  'A fictional bottle used to exercise this site''s bottle page. Nothing here describes a real product.',
  'published', now()
from brands b where b.slug = 'example-distilling'
on conflict (slug) do nothing;

insert into bottle_prices (
  bottle_id, msrp_cents, msrp_source_note, msrp_verified_at,
  steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note
)
select id, 4400, 'Fictional seed data', current_date, 3000, 4000, 5000, 6000,
  'At or under $40 this is an easy yes. Past $50 the shelf around it gets more interesting.'
from bottles where slug = 'example-bourbon-small-batch'
on conflict (bottle_id) do nothing;

insert into reviews (
  bottle_id, quick_take, nose, palate, finish, overall, best_for, skip_if,
  sample_provided, reviewed_at, published_at
)
select id,
  'Comfortably better than its shelf neighbours, and priced like it does not know that.',
  'Caramel, baking spice, a little orange peel.',
  'Thicker than the proof suggests. Brown sugar, clove, dry oak on the back half.',
  'Medium, warm, no rough edges.',
  'The kind of bottle you open on a Tuesday and do not think twice about.',
  'Anyone building a first bourbon shelf, or wanting one bottle that does everything.',
  'You want something delicate, or you already own three bottles in this profile.',
  false, current_date, now()
from bottles where slug = 'example-bourbon-small-batch'
on conflict (bottle_id) do nothing;

insert into tasting_profiles (bottle_id, sweetness, oak, spice, fruit, vanilla, caramel, richness, heat, finish)
select id, 6, 5, 7, 3, 6, 7, 6, 5, 6
from bottles where slug = 'example-bourbon-small-batch'
on conflict (bottle_id) do nothing;

insert into sources (entity_table, entity_id, field_name, source_type, title, verified_at, internal_notes)
select 'bottles', id, 'proof', 'producer', 'Fictional seed source', current_date, 'Demo seed data.'
from bottles where slug = 'example-bourbon-small-batch';

-- ----------------------------------------------------------- alternatives ----

insert into bottles (slug, brand_id, name, classification, proof, abv, mash_bill_status, producer, status, published_at)
select 'sample-creek-single-barrel', b.id, 'Sample Creek Single Barrel',
  'Kentucky Straight Bourbon · Single Barrel', 107, 53.5, 'undisclosed', 'Sample Creek', 'published', now()
from brands b where b.slug = 'sample-creek'
on conflict (slug) do nothing;

insert into bottle_prices (bottle_id, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note)
select id, 4000, 5500, 6500, 7500, 'Fictional seed data.'
from bottles where slug = 'sample-creek-single-barrel'
on conflict (bottle_id) do nothing;

-- A draft bottle, to prove RLS hides it from the public site.
insert into bottles (slug, brand_id, name, classification, proof, mash_bill_status, status)
select 'sample-creek-unreleased', b.id, 'Sample Creek Unreleased',
  'Kentucky Straight Bourbon', 90, 'undisclosed', 'draft'
from brands b where b.slug = 'sample-creek'
on conflict (slug) do nothing;

insert into bottle_relationships (source_bottle_id, target_bottle_id, relationship_type, rank, note)
select s.id, t.id, 'alternative', 1, 'Louder and hotter, and worth the extra ten dollars if you like proof.'
from bottles s, bottles t
where s.slug = 'example-bourbon-small-batch' and t.slug = 'sample-creek-single-barrel'
on conflict do nothing;

-- An alternative pointing at the draft: RLS must keep it off the public page.
insert into bottle_relationships (source_bottle_id, target_bottle_id, relationship_type, rank, note)
select s.id, t.id, 'similar', 2, 'Should not be visible publicly — target is a draft.'
from bottles s, bottles t
where s.slug = 'example-bourbon-small-batch' and t.slug = 'sample-creek-unreleased'
on conflict do nothing;

-- ---------------------------------------------------- retailer + redirect ----

insert into retailers (slug, name, network, is_active, disclosure_note, tracking_config)
values ('example-shop', 'Example Shop', 'demo', true, null, '{"utm_source": "smallbatchbourbon"}'::jsonb)
on conflict (slug) do nothing;

-- An inactive merchant, to prove its links are suppressed site-wide.
insert into retailers (slug, name, network, is_active)
values ('dormant-shop', 'Dormant Shop', 'demo', false)
on conflict (slug) do nothing;

insert into bottle_retailers (bottle_id, retailer_id, destination_url)
select b.id, r.id, 'https://example.com/example-bourbon'
from bottles b, retailers r
where b.slug = 'example-bourbon-small-batch' and r.slug = 'example-shop'
on conflict do nothing;

insert into bottle_retailers (bottle_id, retailer_id, destination_url)
select b.id, r.id, 'https://example.com/should-not-be-reachable'
from bottles b, retailers r
where b.slug = 'example-bourbon-small-batch' and r.slug = 'dormant-shop'
on conflict do nothing;
