// ============================================================================
// Castro Odhiambo — Main Interaction Bundle (v2)
// Handles: mobile nav, scroll reveals, WhatsApp links, filter tabs, modals,
// dynamic rendering (resources / blog), Supabase form submissions —
// PLUS auth-aware navigation, logout, resource gating, the login/register
// forms, the admin login gate, and the full admin dashboard.
//
// Every init function checks for its target elements before doing anything,
// so this single bundle is safe to load, unmodified, on every page.
// ============================================================================

import {
  submitContactMessage, fetchResources, fetchBlogPosts,
  getSession, getMyProfile, signIn, signUpMember, signOut,
  uploadResourceFile, subscribeToTable, fetchOverviewCounts,
  fetchContactMessagesAdmin, updateMessageStatus, deleteContactMessage,
  createResource, deleteResource, fetchResourcesAdmin,
  fetchAllBlogPostsAdmin, createBlogPost, updateBlogPost, deleteBlogPost,
  getLikeState, toggleLike, fetchComments, addComment, updateComment, deleteComment,
  fetchAllCommentsAdmin, setCommentHidden, deleteCommentAdmin,
  trackPostView, trackPostShare, trackResourceView, trackResourceDownload, trackResourceShare,
} from './supabase-client.js';

const WHATSAPP_NUMBER = '254759130506';
const SITE_ORIGIN = window.location.origin + window.location.pathname.replace(/[^/]+$/, '');

/* ---------------------------------------------------------------------- */
/* Mobile Navigation                                                       */
/* ---------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  const current = window.location.pathname.split('/').pop() || 'index.html';
  links.querySelectorAll('a[data-page]').forEach((a) => {
    if (a.dataset.page === current) a.setAttribute('aria-current', 'page');
  });
}

/* ---------------------------------------------------------------------- */
/* Scroll Reveal                                                          */
/* ---------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------------------- */
/* WhatsApp Deep Links                                                    */
/* ---------------------------------------------------------------------- */
function initWhatsAppLinks() {
  document.querySelectorAll('[data-whatsapp-message]').forEach((el) => {
    const message = el.getAttribute('data-whatsapp-message') || 'Hello Castro, I would like to inquire about your services.';
    el.setAttribute('href', `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  });
}

/* ---------------------------------------------------------------------- */
/* Generic Filter Tabs (services.html / resources.html / blog.html)       */
/* ---------------------------------------------------------------------- */
function initFilterTabs(containerSelector, cardSelector, attr = 'data-category') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    container.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');

    const filter = tab.dataset.filter;
    document.querySelectorAll(cardSelector).forEach((card) => {
      const matches = filter === 'all' || card.getAttribute(attr) === filter;
      card.style.display = matches ? '' : 'none';
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Modal System                                                           */
/* ---------------------------------------------------------------------- */
function initModals() {
  document.querySelectorAll('[data-modal-target]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const modal = document.querySelector(trigger.getAttribute('data-modal-target'));
      if (modal) openModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
    overlay.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(overlay));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.is-open').forEach((overlay) => closeModal(overlay));
    }
  });
}

function openModal(modal) {
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  const focusable = modal.querySelector('input, textarea, select, button');
  if (focusable) focusable.focus();
}

function closeModal(modal) {
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

/* ---------------------------------------------------------------------- */
/* ENGAGEMENT — share bar, likes, comments                                */
/* Shared by blog.html and resources.html. `kind` is 'post' or 'resource'. */
/* ---------------------------------------------------------------------- */

/** If the visitor isn't signed in, routes them to login instead of letting
 *  a like/comment silently fail. Uses the page's #gateModal if present
 *  (resources.html, blog.html), otherwise sends them straight to auth.html. */
async function requireMemberOrGate() {
  const session = await getSession();
  if (session) return true;
  const gate = document.querySelector('#gateModal');
  if (gate) { openModal(gate); return false; }
  window.location.href = 'auth.html';
  return false;
}

function shareBarHtml() {
  return `
    <div class="share-bar" role="group" aria-label="Share this">
      <button type="button" class="share-btn" data-share="copy" title="Copy link">🔗 <span>Copy Link</span></button>
      <button type="button" class="share-btn share-btn--whatsapp" data-share="whatsapp" title="Share on WhatsApp">💬 <span>WhatsApp</span></button>
      <button type="button" class="share-btn share-btn--facebook" data-share="facebook" title="Share on Facebook">📘 <span>Facebook</span></button>
      <button type="button" class="share-btn share-btn--x" data-share="x" title="Share on X">𝕏 <span>X</span></button>
      <button type="button" class="share-btn share-btn--linkedin" data-share="linkedin" title="Share on LinkedIn">💼 <span>LinkedIn</span></button>
      <button type="button" class="share-btn share-btn--native hidden" data-share="native" title="Share">📤 <span>Share</span></button>
    </div>`;
}

/** Wires a .share-bar's buttons to the given absolute URL + title, and pings
 *  the view/share counters in Supabase (kind: 'post' | 'resource'). */
function wireShareBar(root, url, title, kind, id) {
  const bar = root.querySelector('.share-bar');
  if (!bar) return;
  const nativeBtn = bar.querySelector('[data-share="native"]');
  if (nativeBtn && navigator.share) nativeBtn.classList.remove('hidden');

  const track = () => { if (kind === 'post') trackPostShare(id); else trackResourceShare(id); };

  bar.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.share;
      if (type === 'copy') {
        try {
          await navigator.clipboard.writeText(url);
          const original = btn.innerHTML;
          btn.innerHTML = '✓ <span>Copied!</span>';
          setTimeout(() => { btn.innerHTML = original; }, 1800);
        } catch { window.prompt('Copy this link:', url); }
      } else if (type === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' — ' + url)}`, '_blank', 'noopener');
      } else if (type === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
      } else if (type === 'x') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener');
      } else if (type === 'linkedin') {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener');
      } else if (type === 'native') {
        try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
      }
      track();
    });
  });
}

/** Renders + wires a like button into `root` (must contain [data-like-btn]). */
async function initLikeButton(root, kind, id) {
  const btn = root.querySelector('[data-like-btn]');
  if (!btn) return;
  const paint = ({ count, likedByMe }) => {
    btn.classList.toggle('is-liked', likedByMe);
    btn.innerHTML = `${likedByMe ? '❤️' : '🤍'} <span data-like-count>${count}</span>`;
  };
  try { paint(await getLikeState(kind, id)); } catch { paint({ count: 0, likedByMe: false }); }

  btn.onclick = async () => {
    if (!(await requireMemberOrGate())) return;
    btn.disabled = true;
    try {
      await toggleLike(kind, id);
      paint(await getLikeState(kind, id));
    } catch (err) {
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  };
}

/** Renders + wires the full comment thread (list + add-comment form) into
 *  `root` (must contain [data-comment-list] and [data-comment-form]). */
async function initComments(root, kind, id) {
  const list = root.querySelector('[data-comment-list]');
  const form = root.querySelector('[data-comment-form]');
  const countEl = root.querySelector('[data-comment-count]');
  if (!list || !form) return;

  const session = await getSession();
  const myId = session?.user?.id;

  async function load() {
    list.innerHTML = '<p class="comment-empty">Loading comments…</p>';
    try {
      const comments = await fetchComments(kind, id);
      if (countEl) countEl.textContent = comments.length;
      render(comments);
    } catch (err) {
      list.innerHTML = '<p class="comment-empty">Could not load comments.</p>';
    }
  }

  function commentTemplate(c) {
    const name = c.profiles?.full_name || c.profiles?.username || 'Member';
    const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const date = formatDate(c.created_at);
    const isMine = c.user_id === myId;
    return `
      <div class="comment-item" data-comment-id="${c.id}">
        <div class="comment-item__avatar">${c.profiles?.avatar_url ? `<img src="${escapeHtml(c.profiles.avatar_url)}" alt="${escapeHtml(name)}">` : escapeHtml(initials)}</div>
        <div class="comment-item__body">
          <div class="comment-item__head">
            <strong>${escapeHtml(name)}</strong>
            <span class="comment-item__date">${date}${c.updated_at && c.updated_at !== c.created_at ? ' · edited' : ''}</span>
          </div>
          <p class="comment-item__text" data-comment-text>${escapeHtml(c.content)}</p>
          <div class="comment-item__actions">
            <button type="button" class="comment-action" data-action="reply">Reply</button>
            ${isMine ? `
              <button type="button" class="comment-action" data-action="edit">Edit</button>
              <button type="button" class="comment-action comment-action--danger" data-action="delete">Delete</button>
            ` : ''}
          </div>
          <form class="comment-reply-form hidden" data-reply-form>
            <textarea rows="2" placeholder="Write a reply…" required></textarea>
            <button type="submit" class="btn btn--primary btn--sm">Post reply</button>
          </form>
        </div>
      </div>`;
  }

  function render(comments) {
    const topLevel = comments.filter((c) => !c.parent_id);
    const repliesOf = (pid) => comments.filter((c) => c.parent_id === pid);

    if (!topLevel.length) { list.innerHTML = '<p class="comment-empty">No comments yet — be the first to share your thoughts.</p>'; return; }

    list.innerHTML = topLevel.map((c) => `
      <div class="comment-thread">
        ${commentTemplate(c)}
        ${repliesOf(c.id).length ? `<div class="comment-replies">${repliesOf(c.id).map(commentTemplate).join('')}</div>` : ''}
      </div>
    `).join('');

    list.querySelectorAll('[data-comment-id]').forEach((item) => {
      const cid = item.dataset.commentId;
      const replyBtn = item.querySelector('[data-action="reply"]');
      const replyForm = item.querySelector('[data-reply-form]');
      replyBtn?.addEventListener('click', () => replyForm.classList.toggle('hidden'));
      replyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!(await requireMemberOrGate())) return;
        const textarea = replyForm.querySelector('textarea');
        const content = textarea.value.trim();
        if (!content) return;
        try { await addComment(kind, id, content, cid); await load(); } catch (err) { console.error(err); }
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        try { await deleteComment(kind, cid); await load(); } catch (err) { console.error(err); }
      });

      item.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
        const textEl = item.querySelector('[data-comment-text]');
        const current = textEl.textContent;
        textEl.outerHTML = `<form class="comment-edit-form" data-edit-form><textarea rows="2" required>${escapeHtml(current)}</textarea><div style="display:flex; gap:8px; margin-top:6px;"><button type="submit" class="btn btn--primary btn--sm">Save</button><button type="button" class="btn btn--ghost btn--sm" data-cancel-edit>Cancel</button></div></form>`;
        const editForm = item.querySelector('[data-edit-form]');
        editForm.querySelector('[data-cancel-edit]').addEventListener('click', () => load());
        editForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const content = editForm.querySelector('textarea').value.trim();
          if (!content) return;
          try { await updateComment(kind, cid, content); await load(); } catch (err) { console.error(err); }
        });
      });
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!(await requireMemberOrGate())) return;
    const textarea = form.querySelector('textarea');
    const content = textarea.value.trim();
    if (!content) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await addComment(kind, id, content);
      textarea.value = '';
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  };

  await load();
}

/* ---------------------------------------------------------------------- */
/* Contact / Lead Forms → Supabase                                        */
/* ---------------------------------------------------------------------- */
function initContactForms() {
  document.querySelectorAll('form[data-contact-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = form.querySelector('.form-status');
      const submitBtn = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);

      const payload = {
        name: (formData.get('name') || '').toString().trim(),
        emailOrPhone: (formData.get('email_or_phone') || '').toString().trim(),
        serviceType: (formData.get('service_type') || 'General Inquiry').toString(),
        message: (formData.get('message') || '').toString().trim(),
      };

      if (!payload.name || !payload.emailOrPhone || !payload.message) {
        setFormStatus(statusEl, 'error', 'Please fill in your name, contact details, and message.');
        return;
      }

      setFormStatus(statusEl, 'loading', 'Sending your message…');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await submitContactMessage(payload);
        setFormStatus(statusEl, 'success', 'Message sent! Castro will get back to you shortly — you can also reach out directly on WhatsApp.');
        form.reset();
      } catch (err) {
        console.error(err);
        setFormStatus(statusEl, 'error', 'Something went wrong sending your message. Please try WhatsApp or email instead.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

function setFormStatus(el, type, message) {
  if (!el) return;
  el.className = `form-status is-visible form-status--${type}`;
  const icon = type === 'loading' ? '<span class="spinner" aria-hidden="true"></span>' : type === 'success' ? '✓' : '⚠';
  el.innerHTML = `${icon} <span>${message}</span>`;
}

/* ---------------------------------------------------------------------- */
/* Resources — dynamic render from Supabase, gated behind login            */
/* ---------------------------------------------------------------------- */
async function renderResources() {
  const grid = document.querySelector('[data-resources-grid]');
  if (!grid) return;

  const [resources, session] = await Promise.all([fetchResources(), getSession()]);
  const isAuthed = !!session;
  grid.innerHTML = '';

  if (!resources.length) {
    grid.innerHTML = `<div class="empty-state"><strong>No resources yet</strong>New study materials are added regularly — check back soon.</div>`;
    return;
  }

  resources.forEach((r) => {
    const card = document.createElement('article');
    card.className = 'card resource-card reveal';
    card.setAttribute('data-category', r.category);
    card.setAttribute('data-title', (r.title || '').toLowerCase());
    card.innerHTML = `
      <div class="resource-card__top">
        <div class="card__icon" aria-hidden="true">📘</div>
        <span class="resource-card__cat">${escapeHtml(r.category)}</span>
      </div>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.description || '')}</p>
      <div class="resource-card__stats">
        <span>👁 ${r.views || 0}</span>
        <span>⬇ ${r.downloads || 0}</span>
      </div>
      <div class="resource-card__foot">
        ${
          isAuthed
            ? `<button class="btn btn--primary btn--sm" data-modal-target="#resourceModal" data-resource-id="${r.id}" data-resource-title="${escapeHtml(r.title)}" data-resource-url="${escapeHtml(r.file_url || '#')}">⬇ Download Note/Exam</button>`
            : `<button class="btn btn--ghost btn--sm" data-gate-trigger>🔒 Download Note/Exam</button>`
        }
      </div>
      ${!isAuthed ? '<div class="resource-card__lock-note">🔒 Login required to unlock</div>' : ''}
    `;
    grid.appendChild(card);
  });

  initReveal();
  attachResourceModalHandlers();
  attachGateTriggers();
  initSearch();

  // Open directly to a shared resource if the URL carries ?resource=id
  const requestedId = new URLSearchParams(window.location.search).get('resource');
  if (requestedId) {
    const btn = document.querySelector(`[data-resource-id="${CSS.escape(requestedId)}"]`);
    btn?.click();
  }
}

function attachResourceModalHandlers() {
  document.querySelectorAll('[data-resource-title]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.querySelector('#resourceModal');
      if (!modal) return;
      const id = btn.dataset.resourceId;
      const title = btn.dataset.resourceTitle;
      const url = btn.dataset.resourceUrl;
      const hasRealFile = url && url !== '#';

      modal.querySelector('[data-resource-modal-title]').textContent = title;

      const previewLink = modal.querySelector('[data-resource-modal-preview]');
      const downloadLink = modal.querySelector('[data-resource-modal-download]');
      const waFallback = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Castro, I would like a copy of "${title}".`)}`;

      if (hasRealFile) {
        previewLink.href = url;
        previewLink.removeAttribute('data-disabled');
        downloadLink.href = url;
        downloadLink.setAttribute('download', '');
        downloadLink.removeAttribute('data-disabled');
      } else {
        // No file on record yet — route both actions to WhatsApp instead.
        previewLink.href = waFallback;
        downloadLink.href = waFallback;
        downloadLink.removeAttribute('download');
      }

      downloadLink.onclick = () => { if (id) trackResourceDownload(id); };

      if (id) {
        const shareUrl = `${SITE_ORIGIN}resources.html?resource=${encodeURIComponent(id)}`;
        const engagementRoot = modal.querySelector('[data-resource-engagement]');
        if (engagementRoot) {
          wireShareBar(engagementRoot, shareUrl, title, 'resource', id);
          initLikeButton(engagementRoot, 'resource', id);
          initComments(engagementRoot, 'resource', id);
        }
        window.history.replaceState(null, '', `resources.html?resource=${encodeURIComponent(id)}`);
        trackResourceView(id);
      }

      openModal(modal);
    });
  });

  document.querySelector('#resourceModal [data-modal-close]')?.addEventListener('click', () => {
    window.history.replaceState(null, '', 'resources.html');
  });
}

/** "Please login or create a free account" gate — required by unauthenticated
 *  visitors clicking Download Note/Exam. */
function attachGateTriggers() {
  document.querySelectorAll('[data-gate-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.querySelector('#gateModal');
      if (modal) openModal(modal);
    });
  });
}

function initSearch() {
  const input = document.querySelector('[data-resource-search]');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('[data-resources-grid] .resource-card').forEach((card) => {
      const activeTab = document.querySelector('.filter-tab.is-active');
      const filter = activeTab ? activeTab.dataset.filter : 'all';
      const matchesCategory = filter === 'all' || card.getAttribute('data-category') === filter;
      const matchesSearch = !q || card.getAttribute('data-title').includes(q);
      card.style.display = matchesCategory && matchesSearch ? '' : 'none';
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Blog — dynamic render from Supabase                                    */
/* ---------------------------------------------------------------------- */
let blogPostsCache = [];

async function renderBlogPosts() {
  const grid = document.querySelector('[data-blog-grid]');
  if (!grid) return;

  const posts = await fetchBlogPosts();
  blogPostsCache = posts;
  grid.innerHTML = '';

  if (!posts.length) {
    grid.innerHTML = `<div class="empty-state"><strong>No articles published yet</strong>Castro is working on the first set of insights — check back soon.</div>`;
    return;
  }

  posts.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.setAttribute('data-category', p.category);
    card.setAttribute('data-post-id', p.id);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.style.cursor = 'pointer';
    const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    card.innerHTML = `
      <span class="blog-card__cat">${escapeHtml(p.category)}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.excerpt || '')}</p>
      <div class="blog-card__meta" style="margin-top:18px;">
        <span class="blog-card__avatar">CO</span>
        <span>Castro Odhiambo</span>
        <span>·</span>
        <span>${date}</span>
        <span>·</span>
        <span>${p.read_time || 4} min read</span>
      </div>
      <div class="blog-card__stats">
        <span>👁 ${p.views || 0} views</span>
      </div>
      <span class="card__link" style="margin-top:10px; display:inline-block;">Read article →</span>
    `;
    grid.appendChild(card);
  });

  initReveal();
  attachBlogModalHandlers();
  initFilterTabs('[data-blog-filters]', '[data-blog-grid] .card');

  // Open directly to a shared article if the URL carries ?post=slug
  const requestedSlug = new URLSearchParams(window.location.search).get('post');
  if (requestedSlug) {
    const match = posts.find((p) => p.slug === requestedSlug);
    if (match) openBlogPost(match);
  }
}

/** Opens the article reader modal for a given post: sets the shareable URL,
 *  page title, injects Article JSON-LD for link-preview/SEO purposes, tracks
 *  the view, and boots the like/comment widgets. */
function openBlogPost(post) {
  const modal = document.querySelector('#blogPostModal');
  if (!modal || !post) return;
  const date = post.created_at ? new Date(post.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  modal.querySelector('#blogModalCategory').textContent = post.category || 'General';
  modal.querySelector('#blogModalTitle').textContent = post.title;
  modal.querySelector('#blogModalMeta').textContent = `Castro Odhiambo · ${date} · ${post.read_time || 4} min read`;
  modal.querySelector('#blogModalContent').textContent = post.content || post.excerpt || 'Full article coming soon.';

  const shareUrl = `${SITE_ORIGIN}blog.html?post=${encodeURIComponent(post.slug)}`;
  const shareRoot = modal.querySelector('[data-blog-engagement]');
  if (shareRoot) {
    wireShareBar(shareRoot, shareUrl, post.title, 'post', post.id);
    initLikeButton(shareRoot, 'post', post.id);
    initComments(shareRoot, 'post', post.id);
  }

  window.history.replaceState(null, '', `blog.html?post=${encodeURIComponent(post.slug)}`);
  document.title = `${post.title} — Castro Odhiambo`;
  setArticleSchema(post, shareUrl);
  trackPostView(post.id);

  openModal(modal);
  modal.addEventListener('transitionend', function reset() {}, { once: true });
}

/** Injects (or replaces) an Article JSON-LD block for the open post — the
 *  best SEO a client-rendered SPA modal can offer without server rendering. */
function setArticleSchema(post, url) {
  document.querySelector('#articleSchema')?.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'articleSchema';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    author: { '@type': 'Person', name: post.author || 'Castro Odhiambo' },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: url,
    url,
  });
  document.head.appendChild(script);
}

/** Restores the page's default title/URL when the article modal closes. */
function resetBlogSeoState() {
  document.querySelector('#articleSchema')?.remove();
  window.history.replaceState(null, '', 'blog.html');
  document.title = 'Blog & Insights — Castro Odhiambo';
}

/** Wires each rendered blog card (click + keyboard) to open the reader modal. */
function attachBlogModalHandlers() {
  document.querySelectorAll('[data-blog-grid] [data-post-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const post = blogPostsCache.find((p) => String(p.id) === card.dataset.postId);
      openBlogPost(post);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const post = blogPostsCache.find((p) => String(p.id) === card.dataset.postId);
        openBlogPost(post);
      }
    });
  });
  document.querySelector('#blogPostModal [data-modal-close]')?.addEventListener('click', resetBlogSeoState);
  document.querySelector('#blogPostModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) resetBlogSeoState();
  });
}

/* ---------------------------------------------------------------------- */
/* Utility                                                                 */
/* ---------------------------------------------------------------------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function initLiveClock() {
  const el = document.querySelector('[data-current-year]');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------------- */
/* LOGOUT — shared across every page                                       */
/* Wires up any element carrying [data-logout] (nav "Logout" button, admin  */
/* sidebar "Sign out") to actually end the Supabase session and redirect.   */
/* ---------------------------------------------------------------------- */
export async function handleLogout(redirectTo = 'index.html') {
  try {
    await signOut();
  } finally {
    window.location.href = redirectTo;
  }
}

function initLogoutButtons() {
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const redirect = btn.getAttribute('data-logout-redirect') || 'index.html';
      handleLogout(redirect);
    });
  });
}

/* ---------------------------------------------------------------------- */
/* AUTH-AWARE NAVIGATION                                                   */
/* Every page's nav-cta carries:                                           */
/*   [data-auth-guest]   — shown when signed out (Login button)            */
/*   [data-auth-member]  — shown when signed in (My Account + Logout)      */
/*   [data-admin-link]   — additionally shown when role = admin            */
/* ---------------------------------------------------------------------- */
async function initAuthNav() {
  const guestEls = document.querySelectorAll('[data-auth-guest]');
  const memberEls = document.querySelectorAll('[data-auth-member]');
  const adminEls = document.querySelectorAll('[data-admin-link]');
  if (!guestEls.length && !memberEls.length) return;

  try {
    const session = await getSession();
    if (session) {
      guestEls.forEach((el) => el.classList.add('hidden'));
      memberEls.forEach((el) => el.classList.remove('hidden'));
      const profile = await getMyProfile();
      if (profile && profile.role === 'admin') {
        adminEls.forEach((el) => el.classList.remove('hidden'));
      }
    } else {
      guestEls.forEach((el) => el.classList.remove('hidden'));
      memberEls.forEach((el) => el.classList.add('hidden'));
    }
  } catch (err) {
    guestEls.forEach((el) => el.classList.remove('hidden'));
    memberEls.forEach((el) => el.classList.add('hidden'));
  }
}

/* ---------------------------------------------------------------------- */
/* AUTH FORMS (auth.html) — dual-tab Login / Register                      */
/* ---------------------------------------------------------------------- */
function initAuthForms() {
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const loginForm = document.querySelector('#loginForm');
  const registerForm = document.querySelector('#registerForm');
  if (!tabs.length && !loginForm && !registerForm) return;

  const errorBox = document.querySelector('#authFormError');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      errorBox?.classList.remove('is-visible');
      if (tab.dataset.authTab === 'login') {
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
      } else {
        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
      }
    });
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox?.classList.remove('is-visible');
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      await signIn({
        email: loginForm.querySelector('#loginEmail').value.trim(),
        password: loginForm.querySelector('#loginPassword').value,
      });
      window.location.href = 'resources.html';
    } catch (err) {
      showAuthError(errorBox, err.message || 'Login failed. Check your credentials and try again.');
      btn.disabled = false; btn.textContent = 'Login';
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox?.classList.remove('is-visible');
    const btn = registerForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      await signUpMember({
        fullName: registerForm.querySelector('#regFullName').value.trim(),
        username: registerForm.querySelector('#regUsername').value.trim(),
        phone: registerForm.querySelector('#regPhone').value.trim(),
        email: registerForm.querySelector('#regEmail').value.trim(),
        password: registerForm.querySelector('#regPassword').value,
      });
      window.location.href = 'resources.html';
    } catch (err) {
      showAuthError(errorBox, err.message || 'Registration failed. Please try again.');
      btn.disabled = false; btn.textContent = 'Create free account';
    }
  });

  // If already logged in, skip straight to the resource bank
  getSession().then((session) => {
    if (session) window.location.href = 'resources.html';
  });
}

function showAuthError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
}

/* ---------------------------------------------------------------------- */
/* ADMIN LOGIN (admin-login.html)                                          */
/* ---------------------------------------------------------------------- */
function initAdminLoginForm() {
  const form = document.querySelector('#adminLoginForm');
  if (!form) return;
  const errorBox = document.querySelector('#authFormError');

  getSession().then(async (session) => {
    if (!session) return;
    const profile = await getMyProfile();
    if (profile && profile.role === 'admin') window.location.href = 'admin.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox?.classList.remove('is-visible');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Verifying…';
    try {
      await signIn({
        email: form.querySelector('#adminEmail').value.trim(),
        password: form.querySelector('#adminPassword').value,
      });
      const profile = await getMyProfile();
      if (!profile || profile.role !== 'admin') {
        await signOut();
        throw new Error('This account does not have admin access.');
      }
      window.location.href = 'admin.html';
    } catch (err) {
      showAuthError(errorBox, err.message || 'Login failed.');
      btn.disabled = false; btn.textContent = 'Access dashboard';
    }
  });
}

/* ---------------------------------------------------------------------- */
/* ADMIN DASHBOARD (admin.html)                                            */
/* ---------------------------------------------------------------------- */
async function initAdminDashboard() {
  const shell = document.querySelector('#adminShell');
  if (!shell) return;

  const gate = document.querySelector('#authGate');
  const session = await getSession();
  const profile = session ? await getMyProfile() : null;

  if (!profile || profile.role !== 'admin') {
    window.location.href = 'admin-login.html';
    return;
  }

  gate?.classList.add('hidden');
  shell.classList.remove('hidden');

  /* Tab navigation */
  document.querySelectorAll('.admin-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelector(`#panel-${btn.dataset.panel}`)?.classList.add('is-active');
    });
  });

  /* ---------------- Overview ---------------- */
  async function loadOverview() {
    try {
      const counts = await fetchOverviewCounts();
      setText('#countLeads', counts.leads);
      setText('#countMembers', counts.members);
      setText('#countResources', counts.resources);
      setText('#countPosts', counts.posts);
      setText('#countLikes', counts.likes);
      setText('#countComments', counts.comments);
      setText('#countViews', counts.views);
      setText('#countDownloads', counts.downloads);
    } catch (err) { console.error(err); }
  }
  function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }

  function prependLiveFeed(row) {
    const tbody = document.querySelector('#liveFeedBody');
    if (!tbody) return;
    if (tbody.children[0]?.children.length === 1) tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.email_or_phone)}</td><td>${escapeHtml(row.service_type || '-')}</td><td>${escapeHtml((row.message || '').slice(0, 60))}${(row.message || '').length > 60 ? '…' : ''}</td><td>${formatDate(row.created_at)}</td>`;
    tbody.prepend(tr);
    while (tbody.children.length > 8) tbody.removeChild(tbody.lastChild);
  }

  /* ---------------- Leads ---------------- */
  async function loadLeads() {
    const tbody = document.querySelector('#leadsBody');
    if (!tbody) return;
    try {
      renderLeads(await fetchContactMessagesAdmin());
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">Could not load leads.</td></tr>`;
    }
  }

  function renderLeads(rows) {
    const tbody = document.querySelector('#leadsBody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="text-center">No inquiries yet.</td></tr>`; return; }
    tbody.innerHTML = rows.map((r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.email_or_phone)}</td>
        <td>${escapeHtml(r.service_type || '-')}</td>
        <td style="max-width:220px;">${escapeHtml(r.message)}</td>
        <td><span class="status-pill ${r.status}">${r.status}</span></td>
        <td>${formatDate(r.created_at)}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="icon-btn" data-action="advance-status" title="Advance status">↻</button>
            <a class="icon-btn" title="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello ' + r.name + ', following up on your message.')}">💬</a>
            <button class="icon-btn icon-btn--danger" data-action="delete-lead" title="Delete">✕</button>
          </div>
        </td>
      </tr>
    `).join('');

    const nextStatus = { unread: 'in-progress', 'in-progress': 'completed', completed: 'unread' };
    tbody.querySelectorAll('[data-action="advance-status"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const pill = tr.querySelector('.status-pill');
        const next = nextStatus[pill.classList[1]];
        try { await updateMessageStatus(tr.dataset.id, next); } catch (err) { console.error(err); }
      });
    });
    tbody.querySelectorAll('[data-action="delete-lead"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        if (!confirm('Delete this inquiry permanently?')) return;
        try { await deleteContactMessage(tr.dataset.id); } catch (err) { console.error(err); }
      });
    });
  }

  /* ---------------- Resources ---------------- */
  async function loadResources() {
    const tbody = document.querySelector('#resourcesBody');
    if (!tbody) return;
    try {
      renderResourcesTable(await fetchResourcesAdmin());
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Could not load resources.</td></tr>`;
    }
  }

  function renderResourcesTable(rows) {
    const tbody = document.querySelector('#resourcesBody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center">No resources uploaded yet.</td></tr>`; return; }
    tbody.innerHTML = rows.map((r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td>${escapeHtml(r.subject || '-')}</td>
        <td>${formatDate(r.created_at)}</td>
        <td><button class="icon-btn icon-btn--danger" data-action="delete-resource" title="Delete">✕</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-action="delete-resource"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        if (!confirm('Delete this resource?')) return;
        try { await deleteResource(tr.dataset.id); } catch (err) { console.error(err); }
      });
    });
  }

  const resourceForm = document.querySelector('#resourceForm');
  resourceForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.querySelector('#resourceFormError');
    errBox?.classList.remove('is-visible');
    const btn = document.querySelector('#resSubmitBtn');
    const fileInput = document.querySelector('#resFile');
    const file = fileInput.files[0];
    if (!file) { showAuthError(errBox, 'Please choose a file to upload.'); return; }
    btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      const fileUrl = await uploadResourceFile(file);
      await createResource({
        title: document.querySelector('#resTitle').value.trim(),
        category: document.querySelector('#resCategory').value,
        subject: document.querySelector('#resSubject').value.trim(),
        description: document.querySelector('#resDescription').value.trim(),
        file_url: fileUrl,
        uploaded_by: profile.id,
      });
      resourceForm.reset();
    } catch (err) {
      showAuthError(errBox, err.message || 'Upload failed. Please try again.');
    } finally {
      btn.disabled = false; btn.textContent = 'Upload resource';
    }
  });

  /* ---------------- Blog ---------------- */
  let postsCache = [];
  async function loadBlog() {
    const tbody = document.querySelector('#blogBody');
    if (!tbody) return;
    try {
      postsCache = await fetchAllBlogPostsAdmin();
      renderBlogTable(postsCache);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">Could not load articles.</td></tr>`;
    }
  }

  function renderBlogTable(rows) {
    const tbody = document.querySelector('#blogBody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="6" class="text-center">No articles yet. Click "New article" to write one.</td></tr>`; return; }
    tbody.innerHTML = rows.map((p) => `
      <tr data-id="${p.id}">
        <td>${escapeHtml(p.title)}</td>
        <td>${escapeHtml(p.category || '-')}</td>
        <td>${p.read_time || 4} min</td>
        <td><label class="toggle-switch"><input type="checkbox" data-action="toggle-publish" ${p.published ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
        <td>${formatDate(p.created_at)}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="icon-btn" data-action="edit-post" title="Edit">✎</button>
            <button class="icon-btn icon-btn--danger" data-action="delete-post" title="Delete">✕</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="toggle-publish"]').forEach((sw) => {
      sw.addEventListener('change', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        try { await updateBlogPost(id, { published: e.target.checked }); }
        catch (err) { e.target.checked = !e.target.checked; console.error(err); }
      });
    });
    tbody.querySelectorAll('[data-action="delete-post"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        if (!confirm('Delete this article?')) return;
        try { await deleteBlogPost(id); } catch (err) { console.error(err); }
      });
    });
    tbody.querySelectorAll('[data-action="edit-post"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const post = postsCache.find((p) => p.id === id);
        if (post) openPostEditor(post);
      });
    });
  }

  const postModal = document.querySelector('#postEditorModal');
  const postForm = document.querySelector('#postForm');
  document.querySelector('#newPostBtn')?.addEventListener('click', () => openPostEditor(null));

  document.querySelector('#postTitle')?.addEventListener('input', (e) => {
    if (!document.querySelector('#postId').value) {
      document.querySelector('#postSlug').value = slugify(e.target.value);
    }
  });

  function openPostEditor(post) {
    document.querySelector('#postEditorTitle').textContent = post ? 'Edit article' : 'New article';
    document.querySelector('#postId').value = post ? post.id : '';
    document.querySelector('#postTitle').value = post ? post.title : '';
    document.querySelector('#postSlug').value = post ? post.slug : '';
    document.querySelector('#postCategoryInput').value = post ? (post.category || '') : '';
    document.querySelector('#postReadTime').value = post ? (post.read_time || 4) : 4;
    document.querySelector('#postExcerpt').value = post ? (post.excerpt || '') : '';
    document.querySelector('#postContent').value = post ? (post.content || '') : '';
    document.querySelector('#postPublished').checked = post ? !!post.published : false;
    document.querySelector('#postFormError')?.classList.remove('is-visible');
    if (postModal) openModal(postModal);
  }

  postForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.querySelector('#postFormError');
    errBox?.classList.remove('is-visible');
    const btn = document.querySelector('#postSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    const id = document.querySelector('#postId').value;
    const payload = {
      title: document.querySelector('#postTitle').value.trim(),
      slug: document.querySelector('#postSlug').value.trim(),
      category: document.querySelector('#postCategoryInput').value.trim() || 'Pedagogy',
      read_time: parseInt(document.querySelector('#postReadTime').value, 10) || 4,
      excerpt: document.querySelector('#postExcerpt').value.trim(),
      content: document.querySelector('#postContent').value.trim(),
      published: document.querySelector('#postPublished').checked,
    };
    try {
      if (id) await updateBlogPost(id, payload);
      else await createBlogPost({ ...payload, author: 'Castro Odhiambo' });
      if (postModal) closeModal(postModal);
    } catch (err) {
      showAuthError(errBox, err.message || 'Could not save article.');
    } finally {
      btn.disabled = false; btn.textContent = 'Save article';
    }
  });

  /* ---------------- Comments moderation ---------------- */
  async function loadComments() {
    const tbody = document.querySelector('#commentsBody');
    if (!tbody) return;
    try {
      renderCommentsTable(await fetchAllCommentsAdmin());
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">Could not load comments. Run schema-v3-engagement.sql if you haven't yet.</td></tr>`;
    }
  }

  function renderCommentsTable(rows) {
    const tbody = document.querySelector('#commentsBody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="6" class="text-center">No comments yet.</td></tr>`; return; }
    tbody.innerHTML = rows.map((c) => `
      <tr data-id="${c.id}" data-kind="${c.kind}">
        <td>${escapeHtml(c.profiles?.full_name || c.profiles?.username || 'Member')}</td>
        <td><span class="service-card__tag">${c.kind === 'post' ? 'Blog' : 'Resource'}</span> ${escapeHtml(c.subject || '')}</td>
        <td style="max-width:260px;">${escapeHtml(c.content)}</td>
        <td>${c.is_hidden ? '<span class="status-pill unread">Hidden</span>' : '<span class="status-pill completed">Visible</span>'}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="icon-btn" data-action="toggle-hide" title="${c.is_hidden ? 'Unhide' : 'Hide'}">${c.is_hidden ? '👁' : '🚫'}</button>
            <button class="icon-btn icon-btn--danger" data-action="delete-comment" title="Delete">✕</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="toggle-hide"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        try { await setCommentHidden(tr.dataset.kind, tr.dataset.id, !tr.querySelector('.status-pill.unread')); await loadComments(); }
        catch (err) { console.error(err); }
      });
    });
    tbody.querySelectorAll('[data-action="delete-comment"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        if (!confirm('Delete this comment permanently?')) return;
        try { await deleteCommentAdmin(tr.dataset.kind, tr.dataset.id); await loadComments(); }
        catch (err) { console.error(err); }
      });
    });
  }

  const commentsSearchInput = document.querySelector('#commentsSearch');
  commentsSearchInput?.addEventListener('input', () => {
    const q = commentsSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('#commentsBody tr[data-id]').forEach((tr) => {
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  /* ---------------- Initial load + realtime ---------------- */
  await Promise.all([loadOverview(), loadLeads(), loadResources(), loadBlog(), loadComments()]);

  subscribeToTable('contact_messages', (payload) => {
    if (payload.eventType === 'INSERT') prependLiveFeed(payload.new);
    loadOverview(); loadLeads();
  });
  subscribeToTable('resources', () => { loadOverview(); loadResources(); });
  subscribeToTable('blog_posts', () => { loadOverview(); loadBlog(); });
  subscribeToTable('post_comments', () => { loadOverview(); loadComments(); });
  subscribeToTable('resource_comments', () => { loadOverview(); loadComments(); });
  subscribeToTable('post_likes', () => loadOverview());
  subscribeToTable('resource_likes', () => loadOverview());
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initWhatsAppLinks();
  initModals();
  initContactForms();
  initLiveClock();
  initLogoutButtons();
  initAuthNav();
  initAuthForms();
  initAdminLoginForm();
  initAdminDashboard();

  initFilterTabs('[data-service-filters]', '[data-services-grid] .card');

  renderResources();
  renderBlogPosts();
});
