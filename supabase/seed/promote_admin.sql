-- ============================================================================
-- Grant editorial access to an existing Supabase Auth user.
--
-- Accounts are created in the Supabase dashboard (Authentication → Users →
-- Add user), never by this project's code — the application has no sign-up
-- path, by design.
--
-- After creating the account, run this with the address you used:
--
--   psql "$DATABASE_URL" -v email="'you@example.com'" -f supabase/seed/promote_admin.sql
--
-- Or paste it into the SQL editor, replacing the address on the line below.
-- ============================================================================

\set email :email

insert into admin_users (user_id, email, display_name, role, is_active)
select u.id, u.email, split_part(u.email, '@', 1), 'admin', true
from auth.users u
where u.email = :email
on conflict (user_id) do update
  set role = 'admin',
      is_active = true,
      email = excluded.email;

select
  au.email,
  au.role,
  au.is_active
from admin_users au
join auth.users u on u.id = au.user_id
where u.email = :email;
