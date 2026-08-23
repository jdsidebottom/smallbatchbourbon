-- ============================================================================
-- RLS probe — repeatable security test.
--
-- Seeds a published bottle, a draft bottle and a retailer destination, then
-- asserts what the `anon` role can and cannot do. Every probe is expected to
-- be refused; a FAIL line is a security defect.
--
-- Run it against a non-production database:
--   psql "$DATABASE_URL" -f supabase/tests/rls_probe.sql
--
-- The whole script runs inside a transaction that is rolled back, so it leaves
-- no rows behind.
-- ============================================================================

begin;

insert into brands (slug, name) values ('rls-probe-brand', 'RLS Probe Brand');

insert into bottles (slug, brand_id, name, status, published_at)
select 'rls-probe-published', id, 'Probe Published', 'published', now()
from brands where slug = 'rls-probe-brand';

insert into bottles (slug, brand_id, name, status)
select 'rls-probe-draft', id, 'Probe Draft', 'draft'
from brands where slug = 'rls-probe-brand';

insert into bottle_prices (bottle_id, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents)
select id, 3000, 4000, 5000, 6000 from bottles where slug = 'rls-probe-published';

insert into retailers (slug, name, is_active) values ('rls-probe-shop', 'Probe Shop', true);

insert into bottle_retailers (bottle_id, retailer_id, destination_url)
select b.id, r.id, 'https://example.com/secret-affiliate-link'
from bottles b, retailers r
where b.slug = 'rls-probe-published' and r.slug = 'rls-probe-shop';

insert into sources (entity_table, entity_id, source_type, title)
select 'bottles', id, 'producer', 'Internal source'
from bottles where slug = 'rls-probe-published';

do $$
declare
  results text := chr(10);
  probe_id uuid;
  visible_bottles int;
  visible_drafts int;
begin
  select id into probe_id from bottles where slug = 'rls-probe-published';

  set local role anon;

  -- Visibility: published rows only.
  select count(*) into visible_bottles from bottles;
  select count(*) into visible_drafts from bottles where status = 'draft';

  results := results || case when visible_bottles = 1
    then 'ok: anon sees exactly the published bottle' else 'FAIL: anon sees ' || visible_bottles || ' bottles' end || chr(10);
  results := results || case when visible_drafts = 0
    then 'ok: anon sees no drafts' else 'FAIL: anon sees drafts' end || chr(10);

  -- Column exposure: the affiliate destination is never readable by a client.
  begin
    perform destination_url from bottle_retailers limit 1;
    results := results || 'FAIL: anon read destination_url' || chr(10);
  exception when others then
    results := results || 'ok: destination_url blocked (' || sqlstate || ')' || chr(10);
  end;

  -- Editorial-internal tables.
  begin
    perform 1 from sources limit 1;
    results := results || 'FAIL: anon read sources' || chr(10);
  exception when others then
    results := results || 'ok: sources blocked (' || sqlstate || ')' || chr(10);
  end;

  begin
    perform 1 from audit_log limit 1;
    results := results || 'FAIL: anon read audit_log' || chr(10);
  exception when others then
    results := results || 'ok: audit_log blocked (' || sqlstate || ')' || chr(10);
  end;

  begin
    perform 1 from admin_users limit 1;
    results := results || 'FAIL: anon read admin_users' || chr(10);
  exception when others then
    results := results || 'ok: admin_users blocked (' || sqlstate || ')' || chr(10);
  end;

  -- Mutation of editorial data.
  begin
    update bottles set name = 'pwned' where id = probe_id;
    results := results || case when found
      then 'FAIL: anon updated a published bottle' else 'ok: anon update matched no rows' end || chr(10);
  exception when others then
    results := results || 'ok: anon update blocked (' || sqlstate || ')' || chr(10);
  end;

  begin
    insert into bottles (slug, brand_id, name)
    select 'anon-injected', id, 'Injected' from brands limit 1;
    results := results || 'FAIL: anon inserted a bottle' || chr(10);
  exception when others then
    results := results || 'ok: anon insert blocked (' || sqlstate || ')' || chr(10);
  end;

  begin
    update bottle_prices set buy_max_cents = 999999 where bottle_id = probe_id;
    results := results || case when found
      then 'FAIL: anon changed a value threshold' else 'ok: anon threshold update matched no rows' end || chr(10);
  exception when others then
    results := results || 'ok: anon threshold update blocked (' || sqlstate || ')' || chr(10);
  end;

  begin
    delete from bottles where id = probe_id;
    results := results || case when found
      then 'FAIL: anon deleted a bottle' else 'ok: anon delete matched no rows' end || chr(10);
  exception when others then
    results := results || 'ok: anon delete blocked (' || sqlstate || ')' || chr(10);
  end;

  -- The authorization helper must not be callable over the REST RPC surface.
  begin
    perform is_active_admin('admin');
    results := results || 'FAIL: anon executed is_active_admin' || chr(10);
  exception when others then
    results := results || 'ok: is_active_admin blocked (' || sqlstate || ')' || chr(10);
  end;

  raise notice '%', results;

  if position('FAIL' in results) > 0 then
    raise exception 'RLS probe failed:%', results;
  end if;
end $$;

rollback;
