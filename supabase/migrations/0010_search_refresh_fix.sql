-- ============================================================================
-- 0010 — Make the brand-rename search refresh actually fire.
--
-- `bottles_search_vector` is declared `before insert or update OF name,
-- classification, producer, actual_distiller, brand_id` (0006). Postgres fires
-- an `UPDATE OF` trigger only when one of those columns appears in the SET
-- clause, and 0006 touched bottles with:
--
--     update bottles set updated_at = updated_at where brand_id = new.id;
--
-- `updated_at` is not in the list, so the trigger never fired. Two consequences:
--
--   * renaming a brand left every one of its bottles indexed under the old
--     name, indefinitely;
--   * the backfill at the end of 0006 used the same statement, so every bottle
--     that predates that migration still has a null search_vector and cannot be
--     found by word search at all.
--
-- The trigram index on `name` is independent and kept working throughout, so
-- autocomplete masked this: typing "buffalo tr" returned results while
-- full-text search quietly missed rows.
--
-- Touching `name` rather than widening the trigger's column list is deliberate.
-- Dropping the `OF` clause would recompute the vector — and re-read `brands` —
-- on every price, status or note edit, which is most writes this table sees.
--
-- `set name = name` writes no audit row: record_audit() diffs the row and
-- returns early when nothing editorial changed, with search_vector already
-- excluded from that diff (0007).
-- ============================================================================

create or replace function brands_refresh_bottle_search()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.name is distinct from old.name then
    -- `name` is in the trigger's OF list; `updated_at` is not.
    update bottles set name = name where brand_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function brands_refresh_bottle_search() from public, anon, authenticated;

-- Rebuild every vector: 0006's backfill reached none of them, and any brand
-- renamed since then left its bottles stale rather than null, which no query
-- can distinguish from a correct one.
--
-- `bottles_updated_at` comes off for the rebuild. Nothing editorial is changing
-- here, and bottle pages render updated_at to readers as the date the entry was
-- last updated (`src/app/bourbon/[slug]/page.tsx`) while the sitemap sends it to
-- Google as lastModified. Letting it bump would tell both that every bottle
-- changed today. The rename path above keeps the bump deliberately — there the
-- displayed brand name really did change.
alter table bottles disable trigger bottles_updated_at;
update bottles set name = name;
alter table bottles enable trigger bottles_updated_at;
