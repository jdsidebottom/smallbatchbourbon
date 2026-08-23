-- ============================================================================
-- 0003 — Row Level Security.
--
-- Deny by default. Anonymous visitors get read-only access to explicitly
-- published records and safe columns, and nothing else. All writes go through
-- the server, which authorizes against admin_users before it acts.
--
-- Column exposure is controlled with GRANTs because RLS gates rows, not
-- columns: revoke everything from the client roles first, then grant back the
-- specific columns the public site is allowed to read.
-- ============================================================================

-- ------------------------------------------------- baseline: revoke all ----

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Future tables inherit the same deny-by-default posture.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------- brands ----

grant select (id, slug, name, parent_company) on brands to anon, authenticated;

create policy brands_public_read on brands
  for select to anon, authenticated
  using (
    exists (
      select 1 from bottles b
      where b.brand_id = brands.id and b.status = 'published'
    )
  );

-- --------------------------------------------------------------- bottles ----

grant select (
  id, slug, brand_id, name, classification, proof, abv,
  has_age_statement, age_years, mash_bill_status, mash_bill_details,
  producer, actual_distiller, description, image_path, image_alt,
  status, published_at, updated_at
) on bottles to anon, authenticated;

create policy bottles_public_read on bottles
  for select to anon, authenticated
  using (status = 'published');

-- --------------------------------------------------------- bottle_prices ----

-- Reference price and the What We'd Pay ladder are public; they are the
-- product. Internal sourcing notes are not.
grant select (
  bottle_id, msrp_cents, currency, msrp_source_url, msrp_verified_at,
  steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents,
  editorial_note, updated_at
) on bottle_prices to anon, authenticated;

create policy bottle_prices_public_read on bottle_prices
  for select to anon, authenticated
  using (
    exists (
      select 1 from bottles b
      where b.id = bottle_prices.bottle_id and b.status = 'published'
    )
  );

-- ------------------------------------------------------ tasting_profiles ----

grant select on tasting_profiles to anon, authenticated;

create policy tasting_profiles_public_read on tasting_profiles
  for select to anon, authenticated
  using (
    exists (
      select 1 from bottles b
      where b.id = tasting_profiles.bottle_id and b.status = 'published'
    )
  );

-- --------------------------------------------------------------- reviews ----

grant select (
  bottle_id, quick_take, nose, palate, finish, overall,
  best_for, skip_if, sample_provided, reviewed_at, published_at
) on reviews to anon, authenticated;

-- A review is visible only when it has been published in its own right AND its
-- bottle is published.
create policy reviews_public_read on reviews
  for select to anon, authenticated
  using (
    published_at is not null
    and exists (
      select 1 from bottles b
      where b.id = reviews.bottle_id and b.status = 'published'
    )
  );

-- -------------------------------------------------- bottle_relationships ----

grant select on bottle_relationships to anon, authenticated;

-- Both ends must be published, or the site would link to a dead page.
create policy bottle_relationships_public_read on bottle_relationships
  for select to anon, authenticated
  using (
    exists (select 1 from bottles s where s.id = source_bottle_id and s.status = 'published')
    and exists (select 1 from bottles t where t.id = target_bottle_id and t.status = 'published')
  );

-- ------------------------------------------------------------- retailers ----

grant select (id, slug, name, network, is_active, disclosure_note) on retailers to anon, authenticated;

create policy retailers_public_read on retailers
  for select to anon, authenticated
  using (is_active);

-- ------------------------------------------------------ bottle_retailers ----

-- destination_url is intentionally NOT granted. The public site links to the
-- internal /go/{merchant}/{bottle} route; the real destination is resolved
-- server-side so an affiliate URL can never be supplied or rewritten by a
-- client.
grant select (id, bottle_id, retailer_id, is_active) on bottle_retailers to anon, authenticated;

create policy bottle_retailers_public_read on bottle_retailers
  for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from retailers r where r.id = retailer_id and r.is_active)
    and exists (select 1 from bottles b where b.id = bottle_id and b.status = 'published')
  );

-- -------------------------------------------------------------- articles ----

grant select (
  id, slug, title, article_type, excerpt, body, methodology,
  status, published_at, reviewed_at, updated_at
) on articles to anon, authenticated;

create policy articles_public_read on articles
  for select to anon, authenticated
  using (status = 'published');

-- ----------------------------------------------------------- guide_items ----

grant select on guide_items to anon, authenticated;

create policy guide_items_public_read on guide_items
  for select to anon, authenticated
  using (
    exists (select 1 from articles a where a.id = article_id and a.status = 'published')
    and exists (select 1 from bottles b where b.id = bottle_id and b.status = 'published')
  );

-- ------------------------------------------- editorial-internal: no grants --
--
-- admin_users, sources, affiliate_clicks and audit_log receive no grants and no
-- policies for anon or authenticated. They are reachable only by the server
-- using the service role, after it has authorized the request itself.
-- The statements below make that explicit rather than implicit.

revoke all on admin_users from anon, authenticated;
revoke all on sources from anon, authenticated;
revoke all on affiliate_clicks from anon, authenticated;
revoke all on audit_log from anon, authenticated;

-- -------------------------------------------------- function permissions ----

revoke all on function is_active_admin(admin_role) from anon, authenticated;
grant execute on function evaluate_verdict(integer, integer, integer, integer, integer)
  to anon, authenticated;
