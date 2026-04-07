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

// ═══════════════════════════════════════════
// FLOATING CHAT WIDGET
// ═══════════════════════════════════════════
export function initChatWidget() {
  // We only show floating widget if not already on chat page
  if (window.location.pathname.includes('chat.html')) return;

  const style = document.createElement('style');
  style.textContent = `
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--bg-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
      transition: transform 0.2s;
    }
    .chat-fab:hover { transform: scale(1.1); }
    .chat-popup {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 350px;
      height: 500px;
      background: var(--bg-dark);
      border: 1px solid var(--border-light);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform-origin: bottom right;
      overflow: hidden;
    }
    .chat-popup.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    @media (max-width: 480px) {
      .chat-popup {
        width: calc(100% - 48px);
        height: 60vh;
        bottom: 90px;
      }
    }
  `;
  document.head.appendChild(style);

  const popup = document.createElement('div');
  popup.className = 'chat-popup';
  popup.innerHTML = '<iframe src="/chat.html?minimal=true" style="width:100%;height:100%;border:none;"></iframe>';
  document.body.appendChild(popup);

  const fab = document.createElement('div');
  fab.className = 'chat-fab';
  fab.innerHTML = '✨';
  fab.title = "Ask Gita AI";
  fab.addEventListener('click', () => {
    popup.classList.toggle('open');
    if (popup.classList.contains('open')) {
      fab.innerHTML = '✖';
      fab.style.background = 'var(--bg-glass)';
      fab.style.color = 'white';
      fab.style.border = '1px solid var(--border-light)';
    } else {
      fab.innerHTML = '✨';
      fab.style.background = 'var(--primary)';
      fab.style.color = 'var(--bg-dark)';
      fab.style.border = 'none';
    }
  });

  document.body.appendChild(fab);
}
