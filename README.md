# Castro.com — Enterprise Web Application

A full-stack site for Castro Odhiambo Otieno built with vanilla HTML5, CSS3 and ES6 JavaScript, backed by Supabase (Auth, Postgres, Storage, Realtime).

## 1. Set up Supabase

1. Open your Supabase project (`gcuqjmdzhwtzuajcqihv`) → **SQL Editor**.
2. Paste the entire contents of `schema.sql` and run it. This creates:
   - `profiles`, `contact_messages`, `resources`, `blog_posts` tables
   - Row Level Security policies for public / member / admin access
   - A trigger that auto-creates a `profiles` row on signup
   - The `resources-files` public storage bucket with upload policies
3. Confirm **Realtime** is enabled for `contact_messages`, `resources`, and `blog_posts` (Database → Replication). The schema already adds them to the `supabase_realtime` publication.

## 2. Create the admin account

1. Open `auth.html` in the deployed site and register a normal account using Castro's own email.
2. Back in the SQL Editor, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'castro@example.com';
   ```
   (replace with the real email used to register)
3. Log in at `admin-login.html` with that same email/password — you'll land on the full dashboard.

## 3. Run locally

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.

## 4. Deploy

- **Static hosting**: upload the whole folder as-is (Netlify, GitHub Pages, Cloudflare Pages).
- **Vercel**: `vercel deploy` from this folder (no build step needed — it's static).

## File structure

| File | Purpose |
|---|---|
| `schema.sql` | Full Supabase database schema, RLS, storage bucket |
| `style.css` | Design system (colors, type, components) |
| `supabase-client.js` | Supabase init + Auth/Storage/Realtime/CRUD helpers |
| `main.js` | Shared nav/footer injection, toasts, auth-aware UI, search helpers |
| `index.html` | Landing page |
| `about.html` | Biography, academic timeline, publications |
| `services.html` | WhatsApp-linked service listing |
| `resources.html` | Gated Exam & Notes Bank |
| `blog.html` | Public blog listing (reads from Supabase) |
| `contact.html` | Contact form → `contact_messages` |
| `auth.html` | Member login / registration |
| `admin-login.html` | Admin-only login gate |
| `admin.html` | Real-time admin dashboard (Overview, Leads, Resources, Blog) |

## Notes

- Update `WHATSAPP_NUMBER` at the top of `main.js` with Castro's real WhatsApp business number.
- The Supabase URL/publishable key are already wired into `supabase-client.js` per the brief. The publishable key is safe to expose client-side — access is enforced entirely by Row Level Security.
