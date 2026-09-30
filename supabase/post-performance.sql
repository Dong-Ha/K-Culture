-- Matches the public latest-story query and gives equal timestamps a stable order.
-- Retain posts_created_by_idx: it supports the auth.users foreign-key checks.
create index if not exists posts_latest_idx
  on public.posts (created_at desc, id desc);
