-- ============================================================================
-- Castro Odhiambo | Personal Site — Supabase Schema Initialization
-- Project Ref: gcuqjmdzhwtzuajcqihv
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- Extension needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. contact_messages
-- ----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  email_or_phone  text not null,
  service_type    text not null default 'General Inquiry',
  message         text not null,
  status          text not null default 'new' check (status in ('new', 'read', 'responded', 'archived'))
);

comment on table public.contact_messages is 'Leads and inquiries submitted via site contact / lead forms.';

alter table public.contact_messages enable row level security;

-- Anyone (anon key) can submit a message
drop policy if exists "Public can insert contact messages" on public.contact_messages;
create policy "Public can insert contact messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

-- Only authenticated (Castro, via dashboard/service role) can read
drop policy if exists "Authenticated can read contact messages" on public.contact_messages;
create policy "Authenticated can read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 2. resources
-- ----------------------------------------------------------------------------
create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  category     text not null, -- 'Mathematics' | 'Computer Studies' | 'KCSE Past Papers' | 'Practical Manuals'
  subject      text,
  file_url     text,
  description  text
);

comment on table public.resources is 'Downloadable notes, past papers and practical manuals.';

alter table public.resources enable row level security;

drop policy if exists "Public can read resources" on public.resources;
create policy "Public can read resources"
  on public.resources
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated can manage resources" on public.resources;
create policy "Authenticated can manage resources"
  on public.resources
  for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 3. blog_posts
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  slug         text not null unique,
  excerpt      text,
  content      text,
  category     text not null, -- 'Pedagogy' | 'Mathematics' | 'Computer Science' | 'Career & Tech'
  read_time    int not null default 4
);

comment on table public.blog_posts is 'Blog / insight articles authored by Castro Odhiambo.';

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read blog posts" on public.blog_posts;
create policy "Public can read blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated can manage blog posts" on public.blog_posts;
create policy "Authenticated can manage blog posts"
  on public.blog_posts
  for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- Helpful indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_resources_category on public.resources (category);
create index if not exists idx_blog_posts_category on public.blog_posts (category);
create index if not exists idx_contact_messages_status on public.contact_messages (status);

-- ----------------------------------------------------------------------------
-- Optional: seed a couple of rows so the site has live data on first load
-- (main.js also ships with local fallback data if these tables are empty)
-- ----------------------------------------------------------------------------
insert into public.resources (title, category, subject, file_url, description)
values
  ('Form 4 KCSE Mathematics Revision Set', 'KCSE Past Papers', 'Mathematics', '#', 'Topical revision questions with worked solutions for Paper 1 and Paper 2.'),
  ('Computer Studies Practical Guide — Excerpt', 'Practical Manuals', 'Computer Studies', '#', 'Step-by-step practical walkthroughs for the KCSE Computer Studies practical paper.'),
  ('Introduction to Digital Competency — Sample Chapter', 'Computer Studies', 'Digital Literacy', '#', 'Free sample chapter from Castro''s published digital competency guide.')
on conflict do nothing;

insert into public.blog_posts (title, slug, excerpt, content, category, read_time)
values
  (
    'Why KCSE Mathematics Feels Hard — And How To Fix It',
    'why-kcse-mathematics-feels-hard',
    'Most students don''t have a mathematics problem. They have a foundations problem. Here''s how to find and close the gap before exam season.',
    'Full article content goes here.',
    'Mathematics',
    5
  ),
  (
    'KUCCPS, HELB and E-Citizen: A Student''s Survival Map',
    'kuccps-helb-ecitizen-survival-map',
    'Three portals, one confusing season. A practical walkthrough of placement, funding and government services every form four leaver should know.',
    'Full article content goes here.',
    'Career & Tech',
    6
  ),
  (
    'Teaching Computer Studies With Barely Any Computers',
    'teaching-computer-studies-with-barely-any-computers',
    'Notes from a classroom in Kuoyo Kochia: what actually works when the ratio of learners to machines is far from ideal.',
    'Full article content goes here.',
    'Pedagogy',
    4
  )
on conflict (slug) do nothing;
