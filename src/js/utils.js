/**
 * Shared utilities for language management, stars, and navigation
 */

// ═══════════════════════════════════════════
// LANGUAGE MANAGEMENT
// ═══════════════════════════════════════════
export function initLanguage() {
  const saved = localStorage.getItem('geetha-lang') || 'en';
  setLanguage(saved);
  
  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn');
      if (!btn) return;
      setLanguage(btn.dataset.lang);
    });
  }
}

export function setLanguage(lang) {
  document.body.setAttribute('data-lang', lang);
  localStorage.setItem('geetha-lang', lang);
  
  // Update toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  // Update all data-en/data-te elements
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) el.textContent = text;
  });
  
  // Trigger custom event for page-specific updates
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function getLang() {
  return localStorage.getItem('geetha-lang') || 'en';
}

// ═══════════════════════════════════════════
// STARS BACKGROUND
// ═══════════════════════════════════════════
export function initStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  
  const count = window.innerWidth < 768 ? 40 : 80;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.width = star.style.height = `${1 + Math.random() * 2}px`;
    container.appendChild(star);
  }
}

// ═══════════════════════════════════════════
// MOBILE NAV
// ═══════════════════════════════════════════
export function initMobileNav() {
  const toggle = document.getElementById('mobile-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }
}

// ═══════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════
export async function apiFetch(path) {
  const res = await fetch(`/api/${path}`);
  if (!res.ok) {
    try {
      const errData = await res.json();
      throw new Error(JSON.stringify(errData, null, 2));
    } catch(e) {
      throw new Error(`API error: ${res.status}`);
    }
  }
  return res.json();
}

// ═══════════════════════════════════════════
// DATE FORMATTING
// ═══════════════════════════════════════════
export function formatDate(dateStr, lang = 'en') {
  const d = new Date(dateStr);
  if (lang === 'te') {
    return d.toLocaleDateString('te-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}
