-- ============================================================================
-- 0006 — Bottle search.
--
-- PostgreSQL-backed search and autocomplete (PRD §16). Two complementary
-- indexes:
--
--   * a tsvector for word matching, which includes the brand name so that
--     searching "Weller" finds every Weller bottle even when a bottle's own
--     name does not repeat the brand;
--   * a trigram index on the name for prefix and near-miss autocomplete, so a
--     shopper typing "buffalo tr" on a phone still gets results.
--
-- The vector is maintained by trigger rather than a generated column because it
-- reads from another table.
-- ============================================================================

create extension if not exists pg_trgm;

alter table bottles add column search_vector tsvector;

create or replace function bottles_refresh_search_vector()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_brand text;
begin
  select b.name into v_brand from brands b where b.id = new.brand_id;

  new.search_vector :=
      setweight(to_tsvector('english', coalesce(v_brand, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.classification, '')), 'B')
    || setweight(to_tsvector('english', coalesce(new.producer, '')), 'C')
    || setweight(to_tsvector('english', coalesce(new.actual_distiller, '')), 'C');

  return new;
end;
$$;

revoke all on function bottles_refresh_search_vector() from public, anon, authenticated;

create trigger bottles_search_vector
  before insert or update of name, classification, producer, actual_distiller, brand_id
  on bottles
  for each row execute function bottles_refresh_search_vector();

-- Renaming a brand has to refresh every bottle that belongs to it.
create or replace function brands_refresh_bottle_search()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.name is distinct from old.name then
    update bottles set updated_at = updated_at where brand_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function brands_refresh_bottle_search() from public, anon, authenticated;

create trigger brands_refresh_search
  after update of name on brands
  for each row execute function brands_refresh_bottle_search();

create index bottles_search_vector_idx on bottles using gin (search_vector);
create index bottles_name_trgm_idx on bottles using gin (name gin_trgm_ops);

-- Filtering on a column requires SELECT privilege on it, so the public role
-- needs the vector even though the site never displays it.
grant select (search_vector) on bottles to anon, authenticated;

-- Backfill anything that already exists.
update bottles set updated_at = updated_at;
