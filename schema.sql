-- ============================================================================
-- Castro Odhiambo | Personal Site — Supabase Schema (v2)
-- Project Ref: gcuqjmdzhwtzuajcqihv
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- v2 adds: member accounts (profiles + role), an admin authorization layer,
-- a published flag on blog_posts, and the resources-files storage bucket —
-- everything needed to power auth.html, admin-login.html and admin.html.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. profiles  (extends auth.users — one row per registered member)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  username      text unique not null,
  full_name     text not null,
  phone_number  text not null,
  email         text not null,
  role          text not null default 'student' check (role in ('student', 'admin'))
);

comment on table public.profiles is 'Extended member profile, linked 1:1 with auth.users. role=admin unlocks the dashboard.';

alter table public.profiles enable row level security;

-- Helper used throughout every RLS policy below (defined before it's referenced)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profiles row whenever someone registers via auth.html
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, phone_number, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', 'New Member'),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    new.email,
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. contact_messages
-- ----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  email_or_phone  text not null,
  service_type    text not null default 'General Inquiry',
  message         text not null,
  status          text not null default 'unread' check (status in ('unread', 'in-progress', 'completed'))
);

comment on table public.contact_messages is 'Leads and inquiries submitted via site contact / lead forms. Admin-only to read.';

alter table public.contact_messages enable row level security;
alter publication supabase_realtime add table public.contact_messages;

drop policy if exists "Public can insert contact messages" on public.contact_messages;
create policy "Public can insert contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Only admin can read contact messages" on public.contact_messages;
create policy "Only admin can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Only admin can update contact messages" on public.contact_messages;
create policy "Only admin can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Only admin can delete contact messages" on public.contact_messages;
create policy "Only admin can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. resources  (Exam & Notes Bank — metadata public, downloads gated in UI)
-- ----------------------------------------------------------------------------
create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  category     text not null check (category in ('Mathematics', 'Computer Studies', 'KCSE Past Papers', 'Practical Manuals')),
  subject      text,
  file_url     text,
  description  text,
  uploaded_by  uuid references public.profiles(id)
);

comment on table public.resources is 'Downloadable notes, past papers and practical manuals. Metadata is public; file access is gated behind login in the UI.';

alter table public.resources enable row level security;
alter publication supabase_realtime add table public.resources;

drop policy if exists "Public can read resources" on public.resources;
create policy "Public can read resources"
  on public.resources for select
  to anon, authenticated
  using (true);

drop policy if exists "Only admin can insert resources" on public.resources;
create policy "Only admin can insert resources"
  on public.resources for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Only admin can update resources" on public.resources;
create policy "Only admin can update resources"
  on public.resources for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Only admin can delete resources" on public.resources;
create policy "Only admin can delete resources"
  on public.resources for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. blog_posts
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  slug         text not null unique,
  excerpt      text,
  content      text,
  category     text not null default 'Pedagogy',
  read_time    int not null default 4,
  published    boolean not null default false,
  author       text not null default 'Castro Odhiambo'
);

comment on table public.blog_posts is 'Blog / insight articles. Only published=true rows are visible to the public; admin sees everything.';

alter table public.blog_posts enable row level security;
alter publication supabase_realtime add table public.blog_posts;

drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts"
  on public.blog_posts for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Only admin can insert posts" on public.blog_posts;
create policy "Only admin can insert posts"
  on public.blog_posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Only admin can update posts" on public.blog_posts;
create policy "Only admin can update posts"
  on public.blog_posts for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Only admin can delete posts" on public.blog_posts;
create policy "Only admin can delete posts"
  on public.blog_posts for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Storage bucket: resources-files
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resources-files', 'resources-files', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view resource files" on storage.objects;
create policy "Anyone can view resource files"
  on storage.objects for select
  using (bucket_id = 'resources-files');

drop policy if exists "Only admin can upload resource files" on storage.objects;
create policy "Only admin can upload resource files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources-files' and public.is_admin());

drop policy if exists "Only admin can update resource files" on storage.objects;
create policy "Only admin can update resource files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resources-files' and public.is_admin());

drop policy if exists "Only admin can delete resource files" on storage.objects;
create policy "Only admin can delete resource files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources-files' and public.is_admin());

-- ----------------------------------------------------------------------------
-- Helpful indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_resources_category on public.resources (category);
create index if not exists idx_blog_posts_category on public.blog_posts (category);
create index if not exists idx_blog_posts_published on public.blog_posts (published);
create index if not exists idx_contact_messages_status on public.contact_messages (status);

-- ----------------------------------------------------------------------------
-- 6. Promote Castro to admin
-- ----------------------------------------------------------------------------
-- Step 1: register a normal account at auth.html using Castro's real email.
-- Step 2: run the line below (with that email) to grant admin access.
--
-- update public.profiles set role = 'admin' where email = 'castro@example.com';

-- ----------------------------------------------------------------------------
-- 7. Optional seed data (safe to skip — main.js also ships with local
--    fallback data so the public site never looks empty before you've
--    uploaded anything from the dashboard)
-- ----------------------------------------------------------------------------
insert into public.blog_posts (title, slug, excerpt, content, category, read_time, published)
values
  (
    'Why KCSE Mathematics Feels Hard — And How To Fix It',
    'why-kcse-mathematics-feels-hard',
    'Most students don''t have a mathematics problem. They have a foundations problem. Here''s how to find and close the gap before exam season.',
    'Full article content goes here.',
    'Mathematics', 5, true
  ),
  (
    'KUCCPS, HELB and E-Citizen: A Student''s Survival Map',
    'kuccps-helb-ecitizen-survival-map',
    'Three portals, one confusing season. A practical walkthrough of placement, funding and government services every form four leaver should know.',
    'Full article content goes here.',
    'Career & Tech', 6, true
  )
on conflict (slug) do nothing;
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
