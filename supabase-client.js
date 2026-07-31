// ============================================================================
// Castro Odhiambo — Supabase Client & Data Access Layer
// Loaded as an ES module. Depends on the Supabase JS SDK (loaded via CDN
// <script type="module"> in each page, see index.html for the import map).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Live project credentials
// ---------------------------------------------------------------------------
const SUPABASE_URL = 'https://gcuqjmdzhwtzuajcqihv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_6Gy0xNjHirYgkVo33O9Lkg_Yis2Ywlj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
        status: 'new',
      },
    ])
    .select();

  if (error) throw error;
  return data;
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

export async function fetchResources() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_RESOURCES;
    return data;
  } catch (err) {
    console.warn('[supabase-client] Falling back to local resource data:', err.message);
    return FALLBACK_RESOURCES;
  }
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
    category: 'Mathematics',
    read_time: 5,
    created_at: new Date('2026-06-02').toISOString(),
  },
  {
    id: 'fallback-2',
    title: 'KUCCPS, HELB and E-Citizen: A Student\u2019s Survival Map',
    slug: 'kuccps-helb-ecitizen-survival-map',
    excerpt: 'Three portals, one confusing season. A practical walkthrough of placement, funding and government services every form four leaver should know.',
    category: 'Career & Tech',
    read_time: 6,
    created_at: new Date('2026-05-14').toISOString(),
  },
  {
    id: 'fallback-3',
    title: 'Teaching Computer Studies With Barely Any Computers',
    slug: 'teaching-computer-studies-with-barely-any-computers',
    excerpt: 'Notes from a classroom in Kuoyo Kochia: what actually works when the ratio of learners to machines is far from ideal.',
    category: 'Pedagogy',
    read_time: 4,
    created_at: new Date('2026-04-28').toISOString(),
  },
  {
    id: 'fallback-4',
    title: 'Five Habits That Separate A- Students From C Students',
    slug: 'five-habits-a-students-vs-c-students',
    excerpt: 'It rarely comes down to raw ability. It comes down to a handful of repeatable habits, most of which are learnable in a term.',
    category: 'Pedagogy',
    read_time: 5,
    created_at: new Date('2026-03-19').toISOString(),
  },
];

export async function fetchBlogPosts() {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_POSTS;
    return data;
  } catch (err) {
    console.warn('[supabase-client] Falling back to local blog data:', err.message);
    return FALLBACK_POSTS;
  }
}
