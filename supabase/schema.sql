create table if not exists public.posts (
  id bigint generated always as identity primary key,
  title varchar(80) not null
    constraint posts_title_length check (char_length(btrim(title)) between 2 and 80)
    constraint posts_title_normalized check (title = btrim(title) and title !~ '[[:cntrl:]]'),
  category varchar(30) not null check (
    category in ('kpop', 'kdrama', 'kfood', 'hanbok', 'festivals', 'travel')
  ),
  content text not null
    constraint posts_content_length check (char_length(btrim(content)) between 10 and 5000)
    constraint posts_content_normalized check (content = btrim(content) and replace(content, chr(10), '') !~ '[[:cntrl:]]'),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete restrict
);

alter table public.posts
  add column if not exists created_by uuid default auth.uid()
  references auth.users(id) on delete restrict;

alter table public.posts alter column content type text;
alter table public.posts drop constraint if exists posts_content_length;
alter table public.posts drop constraint if exists posts_content_normalized;
alter table public.posts add constraint posts_content_length
  check (char_length(btrim(content)) between 10 and 5000) not valid;
alter table public.posts add constraint posts_content_normalized
  check (content = btrim(content) and replace(content, chr(10), '') !~ '[[:cntrl:]]') not valid;
alter table public.posts validate constraint posts_content_length;
alter table public.posts validate constraint posts_content_normalized;

create index if not exists posts_created_by_idx
  on public.posts (created_by);

create index if not exists posts_latest_idx
  on public.posts (created_at desc, id desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass and conname = 'posts_title_normalized'
  ) then
    alter table public.posts add constraint posts_title_normalized
      check (title = btrim(title) and title !~ '[[:cntrl:]]') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass and conname = 'posts_created_by_required'
  ) then
    alter table public.posts add constraint posts_created_by_required
      check (created_by is not null) not valid;
  end if;
end
$$;

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
drop policy if exists "No direct access to admin membership" on public.admins;
create policy "No direct access to admin membership"
on public.admins for select
to anon, authenticated
using (false);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

do $$
declare
  write_policy record;
begin
  for write_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and cmd in ('INSERT', 'UPDATE')
  loop
    execute format('drop policy %I on public.posts', write_policy.policyname);
  end loop;
end
$$;

create policy "Administrators can create posts"
on public.posts for insert
to authenticated
with check ((select private.is_admin()) and created_by = (select auth.uid()));

create policy "Administrators can update posts"
on public.posts for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke create on schema public from public, anon, authenticated;
revoke all privileges on schema private from public, anon;
revoke all privileges on table public.posts from public, anon, authenticated;
revoke all privileges on table public.admins from public, anon, authenticated;
revoke all privileges on sequence public.posts_id_seq from public, anon, authenticated;
revoke all privileges on function private.is_admin() from public, anon;
revoke all privileges on function public.is_admin() from public, anon;

grant usage on schema private to authenticated;
grant select (id, title, category, content, created_at)
  on table public.posts to anon, authenticated;
grant insert (title, category, content)
  on table public.posts to authenticated;
grant update (title, category, content)
  on table public.posts to authenticated;
grant usage on sequence public.posts_id_seq to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
