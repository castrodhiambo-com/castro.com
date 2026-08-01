// ============================================================================
// Castro Odhiambo — Supabase Client & Data Access Layer (v2)
// Loaded as an ES module. Imports the Supabase JS SDK directly from esm.sh —
// no separate CDN <script> tag needed.
//
// v2 adds: Auth (signup/login/logout/session), the profiles table, Storage
// uploads for the resources-files bucket, Realtime subscriptions, and the
// admin CRUD helpers used by admin.html.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Live project credentials
// ---------------------------------------------------------------------------
const SUPABASE_URL = 'https://gcuqjmdzhwtzuajcqihv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_6Gy0xNjHirYgkVo33O9Lkg_Yis2Ywlj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const RESOURCES_BUCKET = 'resources-files';

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

/** Register a new member. Extra fields ride in auth metadata; the
 *  handle_new_user() trigger copies them into public.profiles. */
export async function signUpMember({ fullName, username, phone, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, username, phone_number: phone } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** The signed-in user's profile row (includes role). null if signed out. */
export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) return null;
  return data;
}

export async function isCurrentUserAdmin() {
  const profile = await getMyProfile();
  return !!profile && profile.role === 'admin';
}

// ---------------------------------------------------------------------------
// STORAGE — resources-files bucket
// ---------------------------------------------------------------------------
export async function uploadResourceFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(RESOURCES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(RESOURCES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// REALTIME
// ---------------------------------------------------------------------------
/** Subscribe to INSERT/UPDATE/DELETE on a table. Returns the channel. */
export function subscribeToTable(table, callback) {
  return supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}

// ---------------------------------------------------------------------------
// contact_messages
// ---------------------------------------------------------------------------
/**
 * Insert a new lead / contact message.
 * @param {{name: string, emailOrPhone: string, serviceType: string, message: string}} payload
 */
export async function submitContactMessage(payload) {
  const { name, emailOrPhone, serviceType, message } = payload;
  const { data, error } = await supabase
    .from('contact_messages')
    .insert([
      {
        name,
        email_or_phone: emailOrPhone,
        service_type: serviceType || 'General Inquiry',
        message,
        status: 'unread',
      },
    ])
    .select();

  if (error) throw error;
  return data;
}

// Admin-only reads/writes (RLS enforces the admin check server-side too)
export async function fetchContactMessagesAdmin() {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function updateMessageStatus(id, status) {
  const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
  if (error) throw error;
}
export async function deleteContactMessage(id) {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// resources
// ---------------------------------------------------------------------------
const FALLBACK_RESOURCES = [
  {
    id: 'fallback-1',
    title: 'Form 4 KCSE Mathematics Revision Set',
    category: 'KCSE Past Papers',
    subject: 'Mathematics',
    file_url: '#',
    description: 'Topical revision questions with worked solutions covering Paper 1 and Paper 2 KCSE-style problems.',
  },
  {
    id: 'fallback-2',
    title: 'Computer Studies Practical Guide — Sample',
    category: 'Practical Manuals',
    subject: 'Computer Studies',
    file_url: '#',
    description: 'Step-by-step practical walkthroughs adapted from Castro\u2019s published Practical Guide.',
  },
  {
    id: 'fallback-3',
    title: 'Introduction to Digital Competency — Chapter Sample',
    category: 'Computer Studies',
    subject: 'Digital Literacy',
    file_url: '#',
    description: 'A free sample chapter covering core digital literacy concepts for secondary learners.',
  },
  {
    id: 'fallback-4',
    title: 'Form 3 Algebra & Functions Notes',
    category: 'Mathematics',
    subject: 'Mathematics',
    file_url: '#',
    description: 'Concise class notes on algebraic expressions, functions and graphical relationships.',
  },
  {
    id: 'fallback-5',
    title: 'Spreadsheet & Database Practical Manual',
    category: 'Practical Manuals',
    subject: 'Computer Studies',
    file_url: '#',
    description: 'Guided exercises on spreadsheet formulas and database design for the practical exam.',
  },
  {
    id: 'fallback-6',
    title: 'KCSE Mathematics Paper 2 — Past Paper Pack',
    category: 'KCSE Past Papers',
    subject: 'Mathematics',
    file_url: '#',
    description: 'A curated set of past KCSE Paper 2 questions with marking guides.',
  },
];

/** Admin listing — raw rows only, no fallback substitution. */
export async function fetchResourcesAdmin() {
  const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchResources() {
  try {
    const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_RESOURCES;
    return data;
  } catch (err) {
    console.warn('[supabase-client] Falling back to local resource data:', err.message);
    return FALLBACK_RESOURCES;
  }
}

// Admin-only writes
export async function createResource(payload) {
  const { error } = await supabase.from('resources').insert(payload);
  if (error) throw error;
}
export async function deleteResource(id) {
  const { error } = await supabase.from('resources').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// blog_posts
// ---------------------------------------------------------------------------
const FALLBACK_POSTS = [
  {
    id: 'fallback-1',
    title: 'Why KCSE Mathematics Feels Hard — And How To Fix It',
    slug: 'why-kcse-mathematics-feels-hard',
    excerpt: 'Most students don\u2019t have a mathematics problem. They have a foundations problem. Here\u2019s how to find and close the gap before exam season.',
    content: 'Full article content goes here.',
    category: 'Mathematics',
    read_time: 5,
    published: true,
    author: 'Castro Odhiambo',
    created_at: new Date('2026-06-02').toISOString(),
  },
  {
    id: 'fallback-2',
    title: 'KUCCPS, HELB and E-Citizen: A Student\u2019s Survival Map',
    slug: 'kuccps-helb-ecitizen-survival-map',
    excerpt: 'Three portals, one confusing season. A practical walkthrough of placement, funding and government services every form four leaver should know.',
    content: 'Full article content goes here.',
    category: 'Career & Tech',
    read_time: 6,
    published: true,
    author: 'Castro Odhiambo',
    created_at: new Date('2026-05-14').toISOString(),
  },
  {
    id: 'fallback-3',
    title: 'Teaching Computer Studies With Barely Any Computers',
    slug: 'teaching-computer-studies-with-barely-any-computers',
    excerpt: 'Notes from a classroom in Kuoyo Kochia: what actually works when the ratio of learners to machines is far from ideal.',
    content: 'Full article content goes here.',
    category: 'Pedagogy',
    read_time: 4,
    published: true,
    author: 'Castro Odhiambo',
    created_at: new Date('2026-04-28').toISOString(),
  },
  {
    id: 'fallback-4',
    title: 'Five Habits That Separate A- Students From C Students',
    slug: 'five-habits-a-students-vs-c-students',
    excerpt: 'It rarely comes down to raw ability. It comes down to a handful of repeatable habits, most of which are learnable in a term.',
    content: 'Full article content goes here.',
    category: 'Pedagogy',
    read_time: 5,
    published: true,
    author: 'Castro Odhiambo',
    created_at: new Date('2026-03-19').toISOString(),
  },
];

/** Public blog listing — published posts only (server-enforced via RLS too). */
export async function fetchBlogPosts() {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_POSTS;
    return data;
  } catch (err) {
    console.warn('[supabase-client] Falling back to local blog data:', err.message);
    return FALLBACK_POSTS;
  }
}

/** Admin listing — every post, published or draft. */
export async function fetchAllBlogPostsAdmin() {
  const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createBlogPost(payload) {
  const { error } = await supabase.from('blog_posts').insert(payload);
  if (error) throw error;
}
export async function updateBlogPost(id, payload) {
  const { error } = await supabase.from('blog_posts').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deleteBlogPost(id) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Admin overview counters
// ---------------------------------------------------------------------------
export async function fetchOverviewCounts() {
  const [{ count: leads }, { count: members }, { count: resources }, { count: posts }] = await Promise.all([
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', true),
  ]);

  // Engagement totals (likes/comments/views/downloads) come from the v3
  // schema's admin_overview_counts() RPC. Falls back to zeros if the v3
  // migration hasn't been run yet, so the dashboard never breaks.
  let engagement = { total_likes: 0, total_comments: 0, total_views: 0, total_downloads: 0 };
  try {
    const { data, error } = await supabase.rpc('admin_overview_counts');
    if (!error && data && data[0]) engagement = data[0];
  } catch { /* v3 migration not applied yet — ignore */ }

  return {
    leads: leads || 0,
    members: members || 0,
    resources: resources || 0,
    posts: posts || 0,
    likes: Number(engagement.total_likes) || 0,
    comments: Number(engagement.total_comments) || 0,
    views: Number(engagement.total_views) || 0,
    downloads: Number(engagement.total_downloads) || 0,
  };
}

// ---------------------------------------------------------------------------
// ENGAGEMENT — likes, comments, views/downloads/shares
// Shared helpers parameterised by `kind` ('post' | 'resource') so blog.html
// and resources.html can reuse the exact same functions.
// ---------------------------------------------------------------------------
const ENGAGEMENT_TABLES = {
  post: { likes: 'post_likes', comments: 'post_comments', fk: 'post_id', parent: 'blog_posts' },
  resource: { likes: 'resource_likes', comments: 'resource_comments', fk: 'resource_id', parent: 'resources' },
};

/** Like count + whether the current member has liked it. */
export async function getLikeState(kind, id) {
  const t = ENGAGEMENT_TABLES[kind];
  const session = await getSession();
  const [{ count }, mine] = await Promise.all([
    supabase.from(t.likes).select('*', { count: 'exact', head: true }).eq(t.fk, id),
    session ? supabase.from(t.likes).select('id').eq(t.fk, id).eq('user_id', session.user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { count: count || 0, likedByMe: !!mine?.data };
}

/** Toggles a like on/off for the current member. Throws if signed out. */
export async function toggleLike(kind, id) {
  const t = ENGAGEMENT_TABLES[kind];
  const session = await getSession();
  if (!session) throw new Error('Please login to like this.');
  const { data: existing } = await supabase.from(t.likes).select('id').eq(t.fk, id).eq('user_id', session.user.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from(t.likes).delete().eq('id', existing.id);
    if (error) throw error;
    return false; // now unliked
  }
  const { error } = await supabase.from(t.likes).insert({ [t.fk]: id, user_id: session.user.id });
  if (error) throw error;
  return true; // now liked
}

/** Comments for one post/resource, newest first, with commenter name attached. */
export async function fetchComments(kind, id) {
  const t = ENGAGEMENT_TABLES[kind];
  const { data, error } = await supabase
    .from(t.comments)
    .select('*, profiles:user_id ( full_name, username, avatar_url )')
    .eq(t.fk, id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(kind, id, content, parentId = null) {
  const t = ENGAGEMENT_TABLES[kind];
  const session = await getSession();
  if (!session) throw new Error('Please login to comment.');
  const { data, error } = await supabase
    .from(t.comments)
    .insert({ [t.fk]: id, user_id: session.user.id, content, parent_id: parentId })
    .select('*, profiles:user_id ( full_name, username, avatar_url )')
    .single();
  if (error) throw error;
  return data;
}

export async function updateComment(kind, commentId, content) {
  const t = ENGAGEMENT_TABLES[kind];
  const { error } = await supabase.from(t.comments).update({ content, updated_at: new Date().toISOString() }).eq('id', commentId);
  if (error) throw error;
}

export async function deleteComment(kind, commentId) {
  const t = ENGAGEMENT_TABLES[kind];
  const { error } = await supabase.from(t.comments).delete().eq('id', commentId);
  if (error) throw error;
}

// Admin moderation — sees hidden comments too via the RLS "or is_admin()" clause.
export async function fetchAllCommentsAdmin() {
  const [{ data: postComments, error: e1 }, { data: resourceComments, error: e2 }] = await Promise.all([
    supabase.from('post_comments').select('*, profiles:user_id ( full_name, username ), blog_posts:post_id ( title )').order('created_at', { ascending: false }),
    supabase.from('resource_comments').select('*, profiles:user_id ( full_name, username ), resources:resource_id ( title )').order('created_at', { ascending: false }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const tagged = [
    ...(postComments || []).map((c) => ({ ...c, kind: 'post', subject: c.blog_posts?.title })),
    ...(resourceComments || []).map((c) => ({ ...c, kind: 'resource', subject: c.resources?.title })),
  ];
  return tagged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function setCommentHidden(kind, commentId, hidden) {
  const t = ENGAGEMENT_TABLES[kind];
  const { error } = await supabase.from(t.comments).update({ is_hidden: hidden }).eq('id', commentId);
  if (error) throw error;
}

export async function deleteCommentAdmin(kind, commentId) {
  return deleteComment(kind, commentId);
}

// View / download / share counters — fire-and-forget RPCs, safe for anon.
export async function trackPostView(postId) { try { await supabase.rpc('increment_post_views', { p_post_id: postId }); } catch { /* noop */ } }
export async function trackPostShare(postId) { try { await supabase.rpc('increment_post_shares', { p_post_id: postId }); } catch { /* noop */ } }
export async function trackResourceView(resourceId) { try { await supabase.rpc('increment_resource_views', { p_resource_id: resourceId }); } catch { /* noop */ } }
export async function trackResourceDownload(resourceId) { try { await supabase.rpc('increment_resource_downloads', { p_resource_id: resourceId }); } catch { /* noop */ } }
export async function trackResourceShare(resourceId) { try { await supabase.rpc('increment_resource_shares', { p_resource_id: resourceId }); } catch { /* noop */ } }
