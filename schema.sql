-- ============================================================================
-- CASTRO.COM — SUPABASE SCHEMA
-- Full-stack Web Application for Castro Odhiambo
-- Run this entire file once in the Supabase SQL Editor (Project: gcuqjmdzhwtzuajcqihv)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  username text unique not null,
  full_name text not null,
  phone_number text not null,
  email text not null,
  role text not null default 'student' check (role in ('student', 'admin'))
);

comment on table public.profiles is 'Extended user profile data linked 1:1 with auth.users';

-- ----------------------------------------------------------------------------
-- 2. CONTACT MESSAGES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  email_or_phone text not null,
  service_type text,
  message text not null,
  status text not null default 'unread' check (status in ('unread', 'in-progress', 'completed'))
);

alter publication supabase_realtime add table public.contact_messages;

-- ----------------------------------------------------------------------------
-- 3. RESOURCES TABLE (Exam & Notes Bank)
-- ----------------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null check (category in ('Mathematics', 'Computer Studies', 'KCSE Past Papers', 'Practical Manuals')),
  subject text not null,
  file_url text not null,
  description text,
  uploaded_by uuid references public.profiles(id)
);

alter publication supabase_realtime add table public.resources;

-- ----------------------------------------------------------------------------
-- 4. BLOG POSTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  category text,
  read_time text,
  published boolean not null default false,
  author text not null default 'Castro Odhiambo Otieno'
);

alter publication supabase_realtime add table public.blog_posts;

-- ----------------------------------------------------------------------------
-- 5. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ----------------------------------------------------------------------------
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
-- 6. HELPER FUNCTION: is_admin()
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.contact_messages enable row level security;
alter table public.resources enable row level security;
alter table public.blog_posts enable row level security;

-- PROFILES policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- CONTACT_MESSAGES policies
create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  with check (true);

create policy "Only admin can read contact messages"
  on public.contact_messages for select
  using (public.is_admin());

create policy "Only admin can update contact messages"
  on public.contact_messages for update
  using (public.is_admin());

create policy "Only admin can delete contact messages"
  on public.contact_messages for delete
  using (public.is_admin());

-- RESOURCES policies
create policy "Anyone can view resource metadata"
  on public.resources for select
  using (true);

create policy "Only admin can insert resources"
  on public.resources for insert
  with check (public.is_admin());

create policy "Only admin can update resources"
  on public.resources for update
  using (public.is_admin());

create policy "Only admin can delete resources"
  on public.resources for delete
  using (public.is_admin());

-- BLOG_POSTS policies
create policy "Anyone can view published posts, admin sees all"
  on public.blog_posts for select
  using (published = true or public.is_admin());

create policy "Only admin can insert posts"
  on public.blog_posts for insert
  with check (public.is_admin());

create policy "Only admin can update posts"
  on public.blog_posts for update
  using (public.is_admin());

create policy "Only admin can delete posts"
  on public.blog_posts for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. STORAGE BUCKET: resources-files
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resources-files', 'resources-files', true)
on conflict (id) do nothing;

create policy "Authenticated users can download resource files"
  on storage.objects for select
  using (bucket_id = 'resources-files' and auth.role() = 'authenticated');

create policy "Public can view resource file listing"
  on storage.objects for select
  using (bucket_id = 'resources-files');

create policy "Only admin can upload resource files"
  on storage.objects for insert
  with check (bucket_id = 'resources-files' and public.is_admin());

create policy "Only admin can update resource files"
  on storage.objects for update
  using (bucket_id = 'resources-files' and public.is_admin());

create policy "Only admin can delete resource files"
  on storage.objects for delete
  using (bucket_id = 'resources-files' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. SEED / PROMOTE ADMIN
-- ----------------------------------------------------------------------------
-- After Castro registers a normal account through auth.html with his own email,
-- run the following (replace the email) to promote that account to admin:
--
-- update public.profiles set role = 'admin' where email = 'castro@example.com';
--
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
