/* ============================================================================
   CASTRO.COM — supabase-client.js
   Central Supabase initialization + Auth / Storage / Realtime / CRUD helpers.
   Loaded as an ES module on every page, after the Supabase CDN script.
   ============================================================================ */

const SUPABASE_URL = "https://gcuqjmdzhwtzuajcqihv.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Gy0xNjHirYgkVo33O9Lkg_Yis2Ywlj";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* ------------------------------- AUTH -------------------------------- */

/** Register a new member. Stores extra fields in auth metadata; the DB
 *  trigger (handle_new_user) copies them into public.profiles. */
export async function signUpMember({ fullName, username, phone, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username,
        phone_number: phone
      }
    }
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

/** Fetch the caller's profile row (includes role). Returns null if signed out. */
export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (error) return null;
  return data;
}

export async function isCurrentUserAdmin() {
  const profile = await getMyProfile();
  return !!profile && profile.role === "admin";
}

/* ------------------------------ STORAGE -------------------------------- */

const BUCKET = "resources-files";

/** Upload a file to the resources-files bucket. Returns its public URL. */
export async function uploadResourceFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* ------------------------------ REALTIME -------------------------------- */

/** Subscribe to all changes (INSERT/UPDATE/DELETE) on a table.
 *  callback receives the Supabase Realtime payload. Returns the channel
 *  so callers can unsubscribe later if needed. */
export function subscribeToTable(table, callback) {
  const channel = supabase
    .channel(`realtime:${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe();
  return channel;
}

/* -------------------------------- CRUD ----------------------------------- */

// Contact messages
export async function submitContactMessage(payload) {
  const { error } = await supabase.from("contact_messages").insert(payload);
  if (error) throw error;
}
export async function fetchContactMessages() {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function updateMessageStatus(id, status) {
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) throw error;
}
export async function deleteMessage(id) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw error;
}

// Resources
export async function fetchResources() {
  const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createResource(payload) {
  const { error } = await supabase.from("resources").insert(payload);
  if (error) throw error;
}
export async function deleteResource(id) {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
}
export async function updateResource(id, payload) {
  const { error } = await supabase.from("resources").update(payload).eq("id", id);
  if (error) throw error;
}

// Blog posts
export async function fetchPublishedPosts() {
  const { data, error } = await supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function fetchAllPosts() {
  const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createPost(payload) {
  const { error } = await supabase.from("blog_posts").insert(payload);
  if (error) throw error;
}
export async function updatePost(id, payload) {
  const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
  if (error) throw error;
}
export async function deletePost(id) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

// Dashboard counts
export async function fetchOverviewCounts() {
  const [{ count: leads }, { count: members }, { count: resources }, { count: posts }] = await Promise.all([
    supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("resources").select("*", { count: "exact", head: true }),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("published", true)
  ]);
  return { leads: leads || 0, members: members || 0, resources: resources || 0, posts: posts || 0 };
}
