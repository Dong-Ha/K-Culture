-- Run after schema.sql. Replace the UUID before running the final insert.
-- Find it in Supabase Dashboard > Authentication > Users.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "Administrators can read own membership" on public.admins;
create policy "Administrators can read own membership"
on public.admins for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Anyone can create posts" on public.posts;
drop policy if exists "Administrators can create posts" on public.posts;
create policy "Administrators can create posts"
on public.posts for insert
to authenticated
with check (
  exists (select 1 from public.admins where admins.user_id = auth.uid())
);

revoke insert on table public.posts from anon;
grant insert on table public.posts to authenticated;
grant select on table public.admins to authenticated;

-- After creating the administrator in Authentication > Users, uncomment and edit:
-- insert into public.admins (user_id) values ('YOUR-AUTH-USER-UUID');
