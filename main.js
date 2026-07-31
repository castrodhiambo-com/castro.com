/* ============================================================================
   CASTRO.COM — main.js
   Shared navigation/footer injection, mobile menu, toast system,
   auth-aware nav state, and small utility helpers used across pages.
   ============================================================================ */

import { getSession, getMyProfile, signOut } from "./supabase-client.js";

const WHATSAPP_NUMBER = "254700000000"; // Castro's WhatsApp business number (E.164, no +)

export function waLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ------------------------------- TOASTS -------------------------------- */

export function toast(message, type = "info") {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  el.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = ".25s";
    setTimeout(() => el.remove(), 250);
  }, 3800);
}

/* ---------------------------- NAV / FOOTER ------------------------------ */

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "about.html", label: "About" },
  { href: "services.html", label: "Services" },
  { href: "resources.html", label: "Resources" },
  { href: "blog.html", label: "Blog" },
  { href: "contact.html", label: "Contact" }
];

function headerHTML() {
  const links = NAV_LINKS.map(
    (l) => `<li><a href="${l.href}" data-nav="${l.href}">${l.label}</a></li>`
  ).join("");
  return `
  <header class="navbar">
    <div class="nav-inner">
      <a href="index.html" class="brand"><span class="brand-mark"></span>Castro<span class="mono" style="color:var(--blue)">.com</span></a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
      <ul class="nav-links" id="navLinks">
        ${links}
        <li id="navAdminLink" class="hidden"><a href="admin.html">Admin</a></li>
      </ul>
      <div class="nav-actions" id="navActions">
        <a href="auth.html" class="btn btn-ghost btn-sm" id="navLoginBtn"><span class="label">Login</span></a>
        <a href="resources.html" class="btn btn-primary btn-sm hidden" id="navAccountBtn"><span class="label">My Account</span></a>
      </div>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer>
    <div class="footer-inner">
      <div>
        <a href="index.html" class="brand" style="color:#fff; margin-bottom:12px;"><span class="brand-mark"></span>Castro<span class="mono" style="color:var(--blue)">.com</span></a>
        <p style="color:var(--slate-300); max-width:34ch; font-size:.9rem;">Mathematics &amp; Computer Studies educator — teaching, tutoring, and building the Exam &amp; Notes Bank for Kenyan learners.</p>
      </div>
      <div>
        <h4>Site</h4>
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="services.html">Services</a>
        <a href="blog.html">Blog</a>
      </div>
      <div>
        <h4>Members</h4>
        <a href="resources.html">Exam &amp; Notes Bank</a>
        <a href="auth.html">Login / Register</a>
        <a href="contact.html">Contact</a>
      </div>
      <div>
        <h4>Connect</h4>
        <a href="${waLink('Hello Castro, I found your site and would like to get in touch.')}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="https://linkedin.com/in/castro-odhiambo-otieno-a89b38357" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
    <div class="footer-bottom mono">© <span id="year"></span> Castro Odhiambo Otieno. Built with vanilla HTML, CSS &amp; Supabase.</div>
  </footer>`;
}

async function refreshAuthUI() {
  const loginBtn = document.getElementById("navLoginBtn");
  const accountBtn = document.getElementById("navAccountBtn");
  const adminLink = document.getElementById("navAdminLink");
  try {
    const session = await getSession();
    if (session) {
      loginBtn?.classList.add("hidden");
      accountBtn?.classList.remove("hidden");
      const profile = await getMyProfile();
      if (profile && profile.role === "admin") {
        adminLink?.classList.remove("hidden");
      }
    } else {
      loginBtn?.classList.remove("hidden");
      accountBtn?.classList.add("hidden");
      adminLink?.classList.add("hidden");
    }
  } catch (e) {
    /* fail silent — nav still renders unauthenticated */
  }
}

/** Injects shared header + footer, wires mobile nav + auth-aware nav state.
 *  Call once per page: initSite("resources.html") */
export async function initSite(activePage) {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");
  if (headerMount) headerMount.innerHTML = headerHTML();
  if (footerMount) footerMount.innerHTML = footerHTML();

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const active = document.querySelector(`[data-nav="${activePage}"]`);
  if (active) active.classList.add("active");

  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle?.addEventListener("click", () => links.classList.toggle("open"));
  links?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

  // WhatsApp floating button (skip on admin pages — they have their own chrome)
  if (!document.querySelector(".wa-float") && !document.body.dataset.noWaFloat) {
    const wa = document.createElement("a");
    wa.href = waLink("Hello Castro, I have a question about your tutoring/services.");
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.className = "wa-float";
    wa.setAttribute("aria-label", "Chat on WhatsApp");
    wa.textContent = "💬";
    document.body.appendChild(wa);
  }

  await refreshAuthUI();
}

export async function handleLogout(redirectTo = "index.html") {
  await signOut();
  toast("Signed out successfully", "success");
  setTimeout(() => (window.location.href = redirectTo), 600);
}

/* -------------------------- SIMPLE SEARCH/FILTER ------------------------- */

/** Generic client-side filter: given an array of items and a query string,
 *  returns items where any of `fields` contains the query (case-insensitive). */
export function filterItems(items, query, fields) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => fields.some((f) => (item[f] || "").toString().toLowerCase().includes(q)));
}
