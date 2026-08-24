-- ============================================================================
-- 0007 — Attribute audit entries to a person.
--
-- The audit triggers recorded `auth.uid()` as the actor. That is always null
-- here: admin writes go through the service-role client (they must, because RLS
-- denies the editorial tables to every client role), and the service role
-- carries no user identity. The result was a complete audit trail that could
-- not say who did anything — which fails the requirement it was built for.
--
-- The actor is now passed explicitly. Server actions already know who they
-- authorized, so they stamp `updated_by` on the row and the trigger reads it,
-- still preferring auth.uid() if a real user session is ever the writer.
-- ============================================================================

alter table bottles        add column updated_by uuid references auth.users (id) on delete set null;
alter table bottle_prices  add column updated_by uuid references auth.users (id) on delete set null;
alter table articles       add column updated_by uuid references auth.users (id) on delete set null;
alter table retailers      add column updated_by uuid references auth.users (id) on delete set null;

-- updated_by is editorial-internal: readers have no business knowing which
-- staff member last touched a record.
revoke all (updated_by) on bottles from anon, authenticated;
revoke all (updated_by) on bottle_prices from anon, authenticated;
revoke all (updated_by) on articles from anon, authenticated;
revoke all (updated_by) on retailers from anon, authenticated;

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
  v_actor uuid;
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
        -- Bookkeeping columns are not editorial changes.
        and key not in ('updated_at', 'updated_by', 'search_vector');

    if v_changed is null then
      return new;
    end if;

    v_entity_id := new.id;

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

  v_actor := coalesce(
    auth.uid(),
    case when tg_op = 'DELETE'
         then (to_jsonb(old) ->> 'updated_by')::uuid
         else (to_jsonb(new) ->> 'updated_by')::uuid
    end
  );

  insert into audit_log (actor_id, entity_table, entity_id, action, changed_fields, change)
  values (
    v_actor,
    tg_table_name,
    v_entity_id,
    v_action,
    v_changed,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function record_price_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed text[];
  v_actor uuid;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key)
      into v_changed
      from jsonb_each(to_jsonb(new))
      where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key
        and key not in ('updated_at', 'updated_by');

    if v_changed is null then
      return new;
    end if;
  end if;

  v_actor := coalesce(
    auth.uid(),
    case when tg_op = 'DELETE' then old.updated_by else new.updated_by end
  );

  insert into audit_log (actor_id, entity_table, entity_id, action, changed_fields, change)
  values (
    v_actor,
    'bottle_prices',
    coalesce(new.bottle_id, old.bottle_id),
    lower(tg_op)::audit_action,
    v_changed,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function record_audit() from public, anon, authenticated;
revoke all on function record_price_audit() from public, anon, authenticated;
