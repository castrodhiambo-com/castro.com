# Castro Odhiambo — Site v3 (Engagement + SEO)

**New in v3, on top of everything in v2 below:**

- **Likes** on every blog post and resource — heart toggle, live count, one like per member (enforced by a unique DB constraint), requires the free account you already built in v2.
- **Comments** on every blog post and resource — post, edit your own, delete your own, one level of replies. Admin gets a new **💬 Comments** tab in the dashboard to hide or delete any comment.
- **Sharing** — Copy Link, WhatsApp, Facebook, X, LinkedIn, and native share-sheet on mobile — for both blog posts and resources. Each opened article/resource gets its own shareable URL (`blog.html?post=slug`, `resources.html?resource=id`) that deep-links straight back into that item, with the page `<title>` and an Article JSON‑LD block updated to match — the closest a client-rendered page can get to real per-article SEO without server rendering.
- **View / download / share counters** — tracked automatically (even for logged-out visitors, for views/shares) and shown on cards and in the admin Overview, which now also totals Likes, Comments, Views and Downloads across the whole site.
- **SEO pass on every public page** — canonical URLs, Open Graph + Twitter Card tags, JSON-LD (`Person` on Home/About, `Service` list on Services, `Blog`/`CollectionPage`/`ContactPage` elsewhere), plus new `robots.txt` and `sitemap.xml` at the site root.

### Run the v3 migration

Supabase SQL Editor → paste all of `schema-v3-engagement.sql` → Run. It's additive and safe to re-run; it only adds new tables/columns/RPCs and never touches your existing v2 schema, data, or policies.

### Before you go live — two things only you can fill in

1. **Domain** — every canonical/OG/sitemap URL currently uses the placeholder `https://www.castroodhiambo.co.ke`. Find-and-replace that string across the `.html` files, `robots.txt` and `sitemap.xml` once your real domain is live.
2. **Social preview image** — OG/Twitter tags point to `/assets/og-image.jpg` (1200×630px). Add that image at the site root under `assets/` — a simple banner with your name, "CO" mark and a line about what you do works well.

### What's *not* in this stage

The original brief also asked for a full **member-management CRUD panel** (edit/deactivate/delete members, per-user activity) and an **analytics tab with growth/engagement charts**. Those are a genuinely separate, bigger chunk of admin UI — happy to build them as a follow-up stage once you've confirmed the engagement features above look and behave the way you want in Supabase.

---

# Castro Odhiambo — Site v2 (Auth + Admin Dashboard)

Your original design, kept exactly as built — now upgraded with the full
member/admin system from the brief: authentication, gated downloads, and a
real-time admin dashboard with a working logout.

## What's new vs. your upload

- **`profiles` table + roles** — every signup gets a `student` row automatically; you promote yourself to `admin` with one SQL line.
- **`auth.html`** — dual-tab Login / Register, same `.form-panel` / `.field` styling as your contact form.
- **`admin-login.html`** — separate, robots-excluded admin gate.
- **`admin.html`** — sidebar dashboard (navy, matches your `.site-footer`/`.navbar` palette) with:
  - **Overview** — live counters + a real-time inquiry feed
  - **Leads & Inquiries** — status cycling, WhatsApp follow-up, delete
  - **Resource & Exam Bank Manager** — upload straight to Supabase Storage, table + delete
  - **Blog & Publishing Studio** — create/edit articles, publish/unpublish toggle, delete
  - **Sign out** — bottom of the sidebar, plus a Logout button in every page's nav once you're logged in
- **`resources.html` is now actually gated** — logged-out visitors see a lock icon and a "Please login or create a free account…" modal instead of a live download link.
- **Nav is auth-aware everywhere** — Login button swaps for My Account / Admin / Logout once you're signed in, site-wide, via `main.js`.
- **`schema.sql`** — rewritten to add `profiles`, RLS policies gated on `role = 'admin'`, the `handle_new_user` trigger, and the `resources-files` storage bucket. Your original `contact_messages` / `resources` / `blog_posts` tables are preserved (with `status` values aligned to the brief: `unread` / `in-progress` / `completed`, and a `published` flag added to `blog_posts` so drafts stay hidden until you publish them).

Nothing about your visual design changed — same tokens, same `.btn--primary` /
`.card` / `.modal-overlay` / `.filter-tab` classes, same fonts and shadows.
New components (tables, status pills, the toggle switch, the admin sidebar)
were built to match.

## 1. Run the schema

Supabase SQL Editor → paste all of `schema.sql` → Run. It's safe to re-run;
every policy uses `drop policy if exists` first.

## 2. Become admin

1. Open `auth.html` → Register with your own email.
2. In the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'your@email.com';
   ```
3. Log in at `admin-login.html`.

## 3. Run locally

```bash
npx serve .
```
Then open `http://localhost:3000/index.html`.

## File map

| File | Purpose |
|---|---|
| `schema.sql` | Supabase schema — profiles/roles, RLS, storage bucket |
| `schema-v3-engagement.sql` | v3 migration — likes, comments, view/download/share counters, admin RPCs |
| `style.css` | Your original design system + v2 (auth, admin, gating) + v3 (engagement UI) additions |
| `supabase-client.js` | Supabase client + Auth/Storage/Realtime/CRUD + v3 engagement helpers |
| `main.js` | All page interactions — nav, forms, gating, auth, admin dashboard, logout, v3 engagement |
| `auth.html` | Member Login / Register |
| `admin-login.html` | Admin-only login |
| `admin.html` | Real-time admin dashboard, now with a Comments moderation tab |
| `index.html`, `about.html`, `services.html`, `resources.html`, `blog.html`, `contact.html` | Your original pages, unchanged in design, now auth-aware + SEO tags + (blog/resources) engagement UI |
| `robots.txt`, `sitemap.xml` | New — SEO crawl directives and sitemap for the site root |

Update `WHATSAPP_NUMBER` at the top of `main.js` if it ever changes.
