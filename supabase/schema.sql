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

drop policy if exists "Anyone can create posts" on public.posts;
create policy "Anyone can create posts"
on public.posts for insert
to anon, authenticated
with check (true);

revoke update, delete on table public.posts from anon, authenticated;
grant select, insert on table public.posts to anon, authenticated;
