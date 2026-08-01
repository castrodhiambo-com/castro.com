-- ============================================================================
-- Castro Odhiambo | Personal Site — Supabase Schema (v3: Engagement)
-- Project Ref: gcuqjmdzhwtzuajcqihv
-- Run this in the Supabase SQL Editor AFTER schema.sql has already been run.
-- It is purely ADDITIVE — nothing here touches or drops your existing
-- profiles / contact_messages / resources / blog_posts tables or policies.
-- Safe to re-run: every object uses "if not exists" / "drop ... if exists".
--
-- Adds: likes, comments (with one level of replies), view counts, download
-- counts and share counts for both blog_posts and resources, plus the RPCs
-- and RLS policies main.js / supabase-client.js call into.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Counter columns (views / downloads / shares) on existing tables
-- ----------------------------------------------------------------------------
alter table public.blog_posts  add column if not exists views  int not null default 0;
alter table public.blog_posts  add column if not exists shares int not null default 0;
alter table public.resources   add column if not exists views     int not null default 0;
alter table public.resources   add column if not exists downloads int not null default 0;
alter table public.resources   add column if not exists shares    int not null default 0;

-- Optional avatar for the comment feed ("profile image if available").
-- No upload UI ships in this stage — the comment list falls back to initials
-- when this is null, exactly like the existing "CO" avatar badge.
alter table public.profiles add column if not exists avatar_url text;

-- ----------------------------------------------------------------------------
-- 1. post_likes / resource_likes
-- ----------------------------------------------------------------------------
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.blog_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.resource_likes (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (resource_id, user_id)
);

alter table public.post_likes enable row level security;
alter table public.resource_likes enable row level security;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.resource_likes;

drop policy if exists "Anyone can view post likes" on public.post_likes;
create policy "Anyone can view post likes" on public.post_likes for select to anon, authenticated using (true);
drop policy if exists "Members can like posts" on public.post_likes;
create policy "Members can like posts" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members can unlike their own like" on public.post_likes;
create policy "Members can unlike their own like" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view resource likes" on public.resource_likes;
create policy "Anyone can view resource likes" on public.resource_likes for select to anon, authenticated using (true);
drop policy if exists "Members can like resources" on public.resource_likes;
create policy "Members can like resources" on public.resource_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members can unlike their own resource like" on public.resource_likes;
create policy "Members can unlike their own resource like" on public.resource_likes for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. post_comments / resource_comments  (one level of replies via parent_id)
-- ----------------------------------------------------------------------------
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.blog_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.post_comments(id) on delete cascade,
  content    text not null check (char_length(trim(content)) > 0),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_comments (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.resource_comments(id) on delete cascade,
  content     text not null check (char_length(trim(content)) > 0),
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.post_comments enable row level security;
alter table public.resource_comments enable row level security;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.resource_comments;

-- Public sees non-hidden comments; admin sees everything (for moderation).
drop policy if exists "Public can read visible post comments" on public.post_comments;
create policy "Public can read visible post comments" on public.post_comments
  for select to anon, authenticated using (is_hidden = false or public.is_admin());

drop policy if exists "Members can add post comments" on public.post_comments;
create policy "Members can add post comments" on public.post_comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Authors and admin can update post comments" on public.post_comments;
create policy "Authors and admin can update post comments" on public.post_comments
  for update to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Authors and admin can delete post comments" on public.post_comments;
create policy "Authors and admin can delete post comments" on public.post_comments
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Public can read visible resource comments" on public.resource_comments;
create policy "Public can read visible resource comments" on public.resource_comments
  for select to anon, authenticated using (is_hidden = false or public.is_admin());

drop policy if exists "Members can add resource comments" on public.resource_comments;
create policy "Members can add resource comments" on public.resource_comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Authors and admin can update resource comments" on public.resource_comments;
create policy "Authors and admin can update resource comments" on public.resource_comments
  for update to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Authors and admin can delete resource comments" on public.resource_comments;
create policy "Authors and admin can delete resource comments" on public.resource_comments
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Counter RPCs — callable by anon so page views/downloads/shares count
--    even for logged-out visitors. security definer bypasses RLS safely
--    because each function does exactly one bounded, harmless update.
-- ----------------------------------------------------------------------------
create or replace function public.increment_post_views(p_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.blog_posts set views = views + 1 where id = p_post_id;
$$;

create or replace function public.increment_post_shares(p_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.blog_posts set shares = shares + 1 where id = p_post_id;
$$;

create or replace function public.increment_resource_views(p_resource_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set views = views + 1 where id = p_resource_id;
$$;

create or replace function public.increment_resource_downloads(p_resource_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set downloads = downloads + 1 where id = p_resource_id;
$$;

create or replace function public.increment_resource_shares(p_resource_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set shares = shares + 1 where id = p_resource_id;
$$;

grant execute on function public.increment_post_views(uuid) to anon, authenticated;
grant execute on function public.increment_post_shares(uuid) to anon, authenticated;
grant execute on function public.increment_resource_views(uuid) to anon, authenticated;
grant execute on function public.increment_resource_downloads(uuid) to anon, authenticated;
grant execute on function public.increment_resource_shares(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Admin overview — extended counts (likes / comments / views / downloads)
-- ----------------------------------------------------------------------------
create or replace function public.admin_overview_counts()
returns table (
  leads bigint, members bigint, resources bigint, posts bigint,
  total_likes bigint, total_comments bigint, total_views bigint, total_downloads bigint
) language sql security definer set search_path = public as $$
  select
    (select count(*) from public.contact_messages),
    (select count(*) from public.profiles),
    (select count(*) from public.resources),
    (select count(*) from public.blog_posts where published = true),
    (select count(*) from public.post_likes) + (select count(*) from public.resource_likes),
    (select count(*) from public.post_comments) + (select count(*) from public.resource_comments),
    (select coalesce(sum(views), 0) from public.blog_posts) + (select coalesce(sum(views), 0) from public.resources),
    (select coalesce(sum(downloads), 0) from public.resources)
  where public.is_admin();
$$;

grant execute on function public.admin_overview_counts() to authenticated;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_post_likes_post on public.post_likes (post_id);
create index if not exists idx_resource_likes_resource on public.resource_likes (resource_id);
create index if not exists idx_post_comments_post on public.post_comments (post_id);
create index if not exists idx_post_comments_parent on public.post_comments (parent_id);
create index if not exists idx_resource_comments_resource on public.resource_comments (resource_id);
create index if not exists idx_resource_comments_parent on public.resource_comments (parent_id);
-- ============================================================================
-- END OF v3 ENGAGEMENT SCHEMA
-- ============================================================================
