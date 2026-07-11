create table if not exists public.posts (
  id bigint generated always as identity primary key,
  title varchar(80) not null check (char_length(trim(title)) between 2 and 80),
  category varchar(30) not null check (
    category in ('kpop', 'kdrama', 'kfood', 'hanbok', 'festivals', 'travel')
  ),
  content varchar(420) not null check (char_length(trim(content)) between 10 and 420),
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
on public.posts for select
to anon, authenticated
using (true);

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
with check (exists (select 1 from public.admins where admins.user_id = auth.uid()));

revoke update, delete on table public.posts from anon, authenticated;
revoke insert on table public.posts from anon;
grant select on table public.posts to anon, authenticated;
grant insert on table public.posts to authenticated;
grant select on table public.admins to authenticated;
