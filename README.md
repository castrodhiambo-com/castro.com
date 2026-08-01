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
| `style.css` | Your original design system + v2 additions (auth, admin, gating) |
| `supabase-client.js` | Supabase client + Auth/Storage/Realtime/CRUD helpers |
| `main.js` | All page interactions — nav, forms, gating, auth, admin dashboard, logout |
| `auth.html` | Member Login / Register |
| `admin-login.html` | Admin-only login |
| `admin.html` | Real-time admin dashboard |
| `index.html`, `about.html`, `services.html`, `resources.html`, `blog.html`, `contact.html` | Your original pages, unchanged in design, now auth-aware |

Update `WHATSAPP_NUMBER` at the top of `main.js` if it ever changes.
