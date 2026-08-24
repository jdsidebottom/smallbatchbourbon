-- ============================================================================
-- 0009 — Attribute guide reordering to a person.
--
-- 0008's reorder_guide_items() set `rank` and nothing else. The audit trigger
-- reads the actor from `updated_by`, falling back from auth.uid() — which is
-- always null here, because admin writes go through the service role — so every
-- reorder landed in audit_log with actor_id null.
--
-- Reordering a guide is not cosmetic: it decides which bottle is presented as
-- the top pick. It gets the same attribution as every other editorial change.
-- ============================================================================

drop function if exists reorder_guide_items(uuid, uuid[]);

create function reorder_guide_items(p_article_id uuid, p_item_ids uuid[], p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update guide_items gi
     set rank = ord.n,
         updated_by = p_actor
    from unnest(p_item_ids) with ordinality as ord (id, n)
   where gi.id = ord.id
     and gi.article_id = p_article_id
     -- Without this, a no-op reorder would still stamp every row and fire the
     -- audit trigger, filling the log with changes nobody made.
     and gi.rank is distinct from ord.n;
end;
$$;

revoke all on function reorder_guide_items(uuid, uuid[], uuid) from public, anon, authenticated;
