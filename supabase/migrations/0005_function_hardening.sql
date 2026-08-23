-- ============================================================================
-- 0005 — Function hardening.
--
-- Two issues the database linter caught after 0003:
--
-- 1. Revoking EXECUTE from `anon` and `authenticated` does not remove the
--    implicit grant to PUBLIC that Postgres gives every new function. The
--    trigger functions were therefore still reachable over PostgREST as
--    /rest/v1/rpc/record_audit. Trigger functions have no business being
--    callable at all, so EXECUTE is revoked from PUBLIC and granted only to
--    the roles that need it.
--
-- 2. A SECURITY DEFINER function without a pinned search_path can be steered
--    into resolving an unqualified name against a schema the caller controls.
--    Every function here now pins it.
-- ============================================================================

-- --------------------------------------------------- pinned search paths ----

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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
set search_path = public, pg_temp
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

-- ------------------------------------------------ revoke the PUBLIC grant ----

-- Trigger functions: never callable directly, by anyone.
revoke all on function record_audit() from public, anon, authenticated;
revoke all on function record_price_audit() from public, anon, authenticated;
revoke all on function set_updated_at() from public, anon, authenticated;

-- Authorization helper: server-side only.
revoke all on function is_active_admin(admin_role) from public, anon, authenticated;

-- The verdict function is deliberately public — it is the product, it reads no
-- data, and it is SECURITY INVOKER.
grant execute on function evaluate_verdict(integer, integer, integer, integer, integer)
  to anon, authenticated;
