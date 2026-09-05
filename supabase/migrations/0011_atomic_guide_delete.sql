-- ============================================================================
-- 0011 - Delete a guide pick as one transaction, attributed to the deleter.
--
-- record_audit() reads the actor for a DELETE from OLD.updated_by, because
-- auth.uid() is null on every admin write (they go through the service role).
-- deleteGuideItem authorized the current user and then deleted the row without
-- stamping them, so the log recorded whoever last *edited* the pick as having
-- removed it. Deleting a colleague's pick blamed the colleague.
--
-- The renumber that closed the rank gap afterwards was a second request that
-- ignored the errors from both its SELECT and its RPC, while the action still
-- reported success. A failure there left a permanent gap in the ranks.
--
-- Both problems are the same shape: two requests where there should be one
-- transaction. Stamping and deleting separately also leaves a window for
-- another write to land in between.
--
-- guide_items_rank_unique is DEFERRABLE INITIALLY DEFERRED (0008), so the
-- renumber inside this function is checked once at commit, with every rank
-- already in its final place.
-- ============================================================================

create function delete_guide_item(p_article_id uuid, p_item_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if p_actor is null then
    raise exception 'Actor is required';
  end if;

  -- Serialize against a concurrent delete or reorder of the same guide.
  perform 1 from articles where id = p_article_id for update;

  -- Stamping updated_by is what the audit trigger will read as the actor on the
  -- delete below. It writes no audit row of its own: record_audit() diffs the
  -- row and returns early when only bookkeeping columns changed (0007).
  update guide_items set updated_by = p_actor
   where id = p_item_id and article_id = p_article_id;

  if not found then
    raise exception 'Unknown pick';
  end if;

  delete from guide_items where id = p_item_id and article_id = p_article_id;

  -- Close the gap the deletion left, so the numbering an editor sees matches
  -- the order the guide renders in.
  select array_agg(id order by rank) into v_ids
    from guide_items where article_id = p_article_id;

  if v_ids is not null then
    perform reorder_guide_items(p_article_id, v_ids, p_actor);
  end if;
end;
$$;

-- Same shape as every other privileged function here: anon and authenticated
-- lose the implicit grant, and service_role keeps the one Supabase's default
-- privileges give it. No explicit service_role grant, for the same reason
-- reorder_guide_items does not have one.
revoke all on function delete_guide_item(uuid, uuid, uuid) from public, anon, authenticated;
