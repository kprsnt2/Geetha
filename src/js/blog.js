/**
 * Blog page — listing and detail views
 */
import { initLanguage, initStars, initMobileNav, apiFetch, getLang, formatDate } from './utils.js';

let currentFilter = 'all';
let allBlogs = [];

async function loadBlogs(filter = 'all') {
  const grid = document.getElementById('blog-grid');
  const loading = document.getElementById('blog-loading');
  const empty = document.getElementById('blog-empty');

  try {
    const params = filter !== 'all' ? `?type=${filter}` : '';
    const data = await apiFetch(`blogs${params}`);
    allBlogs = data.blogs || [];

    if (loading) loading.style.display = 'none';

    if (allBlogs.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    renderBlogList(allBlogs);
  } catch (err) {
    console.error('Failed to load blogs:', err);
    if (loading) loading.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <p>No blogs available yet. Generate the first one with the daily script!</p>
      </div>
    `;
  }
}

function renderBlogList(blogs) {
  const grid = document.getElementById('blog-grid');
  const lang = getLang();

  grid.innerHTML = blogs.map(blog => {
    const title = lang === 'te' && blog.title_te ? blog.title_te : blog.title_en;
    const excerpt = lang === 'te' && blog.excerpt_te ? blog.excerpt_te : blog.excerpt_en;
    const date = formatDate(blog.created_at, lang);
    const shlokaRef = blog.shloka_id ? `📖 ${blog.shloka_id.replace('BG', 'BG ')}` : '';
    const tags = blog.tags ? (typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags) : [];

    return `
      <article class="blog-card" data-id="${blog.id}" onclick="window.__showBlogDetail(${blog.id})">
        <div class="blog-card-meta">
          <span class="type-badge ${blog.type}">${blog.type === 'ai' ? '🤖 AI' : '🖊️ Personal'}</span>
          <span>${date}</span>
          ${shlokaRef ? `<span class="blog-card-shloka-ref">${shlokaRef}</span>` : ''}
        </div>
        <h2 class="blog-card-title lang-content">${title}</h2>
        <p class="blog-card-excerpt lang-content">${excerpt}</p>
        ${tags.length ? `<div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">${tags.slice(0, 3).map(t => `<span style="font-size: 0.75rem; color: var(--text-muted); background: var(--bg-glass); padding: 2px 8px; border-radius: 12px;">#${t}</span>`).join('')}</div>` : ''}
      </article>
    `;
  }).join('');
}

// Show blog detail
window.__showBlogDetail = function(blogId) {
  const blog = allBlogs.find(b => b.id === blogId);
  if (!blog) return;

  const lang = getLang();
  document.getElementById('blog-list-view').style.display = 'none';
  document.getElementById('blog-detail-view').style.display = 'block';

  const title = lang === 'te' && blog.title_te ? blog.title_te : blog.title_en;
  const content = lang === 'te' && blog.content_te ? blog.content_te : blog.content_en;
  const date = formatDate(blog.created_at, lang);

  document.getElementById('blog-detail-title').textContent = title;
  document.getElementById('blog-detail-meta').innerHTML = `
    <span class="type-badge ${blog.type}">${blog.type === 'ai' ? '🤖 AI Insight' : '🖊️ Life Note'}</span>
    <span>${date}</span>
    ${blog.shloka_id ? `<span>📖 ${blog.shloka_id.replace('BG', 'BG ')}</span>` : ''}
  `;

  const contentEl = document.getElementById('blog-detail-content');
  contentEl.innerHTML = content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Back button
document.getElementById('blog-back')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('blog-detail-view').style.display = 'none';
  document.getElementById('blog-list-view').style.display = 'block';
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadBlogs(currentFilter);
  });
});

// Language change
window.addEventListener('langchange', () => {
  if (allBlogs.length > 0) {
    renderBlogList(allBlogs);
  }
});

// Init
initLanguage();
initStars();
initMobileNav();
loadBlogs();
