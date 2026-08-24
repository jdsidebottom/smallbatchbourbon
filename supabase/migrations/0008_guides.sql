-- ============================================================================
-- 0008 — Buying-guide builder support.
--
-- The article and guide_item tables were created in 0002. What they lacked was
-- the bookkeeping the rest of the editorial schema has: guide_items recorded no
-- update time, no actor, and left no audit trail — so re-ranking a guide or
-- rewriting a pick's rationale was an invisible editorial change.
--
-- Nothing here duplicates bottle facts. A guide item stores only the rank, the
-- label and the guide-specific rationale; proof, MSRP, the price ladder and the
-- verdict continue to render from the canonical bottle record (PRD §11).
-- ============================================================================

alter table guide_items add column updated_at timestamptz not null default now();
alter table guide_items add column updated_by uuid references auth.users (id) on delete set null;

-- Editorial-internal, like every other updated_by on this schema.
--
-- A column-level REVOKE cannot claw back a table-level GRANT: 0003 granted
-- `select on guide_items` with no column list, which covers every column the
-- table will ever have, and revoking one column from that leaves the table-wide
-- grant intact. So the table-wide grant is dropped and the public columns are
-- re-granted by name — the same shape every other public table already uses.
revoke select on guide_items from anon, authenticated;
grant select (id, article_id, bottle_id, rank, label, rationale)
  on guide_items to anon, authenticated;

create trigger guide_items_updated_at
  before update on guide_items
  for each row execute function set_updated_at();

create trigger guide_items_audit
  after insert or update or delete on guide_items
  for each row execute function record_audit();

-- A guide's ordering is the editorial claim ("our third pick"), so two items
-- cannot share a rank within one guide.
alter table guide_items
  add constraint guide_items_rank_unique unique (article_id, rank) deferrable initially deferred;

alter table guide_items
  add constraint guide_items_rank_positive check (rank > 0);

-- Reordering swaps ranks, which transiently collides. PostgREST issues one
-- statement per request, so a two-request swap would violate the constraint
-- halfway through — hence a single-statement renumber, whose deferred check
-- runs once at commit with every rank already in its final place.
create function reorder_guide_items(p_article_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update guide_items gi
     set rank = ord.n
    from unnest(p_item_ids) with ordinality as ord (id, n)
   where gi.id = ord.id
     and gi.article_id = p_article_id;
end;
$$;

revoke all on function reorder_guide_items(uuid, uuid[]) from public, anon, authenticated;

-- ------------------------------------------------------------- articles ----

-- Guides carry their own short intro above the picks. `excerpt` is the meta
-- description and gets truncated by search engines, so it is the wrong field to
-- reuse for on-page copy.
alter table articles add column intro text;
alter table articles add column hero_image_path text;
alter table articles add column hero_image_alt text;

-- The same rule bottles already follow: an image without alt text is unusable.
alter table articles
  add constraint articles_hero_alt_present
  check (hero_image_path is null or hero_image_alt is not null);

grant select (intro, hero_image_path, hero_image_alt) on articles to anon, authenticated;

-- Guide URLs are /best/{slug}, /learn/{slug} and so on: the route prefix comes
-- from article_type, so a slug is a single path segment and never contains '/'.
-- 0002 allowed slashes; tighten it now, before any content exists to migrate.
alter table articles drop constraint articles_slug_format;
alter table articles
  add constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create index articles_published_idx on articles (article_type, published_at desc)
  where status = 'published';
