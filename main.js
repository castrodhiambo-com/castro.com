// ============================================================================
// Castro Odhiambo — Main Interaction Bundle
// Handles: mobile nav, scroll reveals, WhatsApp links, filter tabs, modals,
// dynamic rendering (resources / blog), and Supabase form submissions.
// ============================================================================

import { submitContactMessage, fetchResources, fetchBlogPosts } from './supabase-client.js';

const WHATSAPP_NUMBER = '254759130506';

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

  // Mark current page link
  const current = window.location.pathname.split('/').pop() || 'index.html';
  links.querySelectorAll('a[data-page]').forEach((a) => {
    if (a.dataset.page === current) a.setAttribute('aria-current', 'page');
  });
}

/* ---------------------------------------------------------------------- */
/* Scroll Reveal                                                          */
/* ---------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
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
/* Resources — dynamic render from Supabase                               */
/* ---------------------------------------------------------------------- */
async function renderResources() {
  const grid = document.querySelector('[data-resources-grid]');
  if (!grid) return;

  const resources = await fetchResources();
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
      <div class="resource-card__foot">
        <button class="btn btn--primary btn--sm" data-modal-target="#resourceModal" data-resource-title="${escapeHtml(r.title)}" data-resource-url="${escapeHtml(r.file_url || '#')}">View &amp; Download</button>
      </div>
    `;
    grid.appendChild(card);
  });

  initReveal();
  attachResourceModalHandlers();
  initSearch();
}

function attachResourceModalHandlers() {
  document.querySelectorAll('[data-resource-title]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.querySelector('#resourceModal');
      if (!modal) return;
      modal.querySelector('[data-resource-modal-title]').textContent = btn.dataset.resourceTitle;
      const link = modal.querySelector('[data-resource-modal-link]');
      link.href = btn.dataset.resourceUrl && btn.dataset.resourceUrl !== '#'
        ? btn.dataset.resourceUrl
        : `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Castro, I would like a copy of "${btn.dataset.resourceTitle}".`)}`;
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
function initialsFor(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

async function renderBlogPosts() {
  const grid = document.querySelector('[data-blog-grid]');
  if (!grid) return;

  const posts = await fetchBlogPosts();
  grid.innerHTML = '';

  if (!posts.length) {
    grid.innerHTML = `<div class="empty-state"><strong>No articles published yet</strong>Castro is working on the first set of insights — check back soon.</div>`;
    return;
  }

  posts.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.setAttribute('data-category', p.category);
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
    `;
    grid.appendChild(card);
  });

  initReveal();
  initFilterTabs('[data-blog-filters]', '[data-blog-grid] .card');
}

/* ---------------------------------------------------------------------- */
/* Utility                                                                 */
/* ---------------------------------------------------------------------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function initLiveClock() {
  const el = document.querySelector('[data-current-year]');
  if (el) el.textContent = new Date().getFullYear();
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

  initFilterTabs('[data-service-filters]', '[data-services-grid] .card');

  renderResources();
  renderBlogPosts();
});
