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

  let html = '';
  let currentChapter = -1;

  const chapterTitlesEn = ["Arjuna Visada Yoga", "Sankhya Yoga", "Karma Yoga", "Jnana Karma Sanyasa Yoga", "Karma Sanyasa Yoga", "Dhyana Yoga", "Jnana Vijnana Yoga", "Akshara Brahma Yoga", "Raja Vidya Raja Guhya Yoga", "Vibhuti Yoga", "Viswarupa Darshana Yoga", "Bhakti Yoga", "Kshetra Kshetrajna Vibhaga Yoga", "Gunatraya Vibhaga Yoga", "Purushottama Yoga", "Daivasura Sampad Vibhaga Yoga", "Shraddhatraya Vibhaga Yoga", "Moksha Sanyasa Yoga"];
  const chapterTitlesTe = ["అర్జున విషాద యోగము", "సాంఖ్య యోగము", "కర్మ యోగము", "జ్ఞాన కర్మ సన్యాస యోగము", "కర్మ సన్యాస యోగము", "ధ్యాన యోగము", "జ్ఞాన విజ్ఞాన యోగము", "అక్షర బ్రహ్మ యోగము", "రాజ విద్యా రాజ గుహ్య యోగము", "విభూతి యోగము", "విశ్వరూప దర్శన యోగము", "భక్తి యోగము", "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము", "గుణత్రయ విభాగ యోగము", "పురుషోత్తమ యోగము", "దైవాసుర సంపద్ విభాగ యోగము", "శ్రద్ధాత్రయ విభాగ యోగము", "మోక్ష సన్యాస యోగము"];

  blogs.forEach(blog => {
    // Add chapter divider if chapter changes (and if blog has chapter info)
    if (blog.chapter && blog.chapter !== currentChapter) {
      currentChapter = blog.chapter;
      const chNameEn = `Chapter ${currentChapter} — ${chapterTitlesEn[currentChapter - 1]}`;
      const chNameTe = `అధ్యాయం ${currentChapter} — ${chapterTitlesTe[currentChapter - 1]}`;
      const chName = lang === 'te' ? chNameTe : chNameEn;
      
      html += `
        <div class="chapter-divider" style="width: 100%; margin: 2rem 0 1rem; border-bottom: 2px solid var(--border-light); padding-bottom: 0.5rem; grid-column: 1 / -1;">
          <h2 style="font-size: 1.2rem; font-weight: 500; font-family: var(--font-sanskrit); color: var(--primary);" class="lang-content" data-en="${chNameEn}" data-te="${chNameTe}">${chName}</h2>
        </div>
      `;
    }

    const title = lang === 'te' && blog.title_te ? blog.title_te : blog.title_en;
    const excerpt = lang === 'te' && blog.excerpt_te ? blog.excerpt_te : blog.excerpt_en;
    const date = formatDate(blog.created_at, lang);
    const shlokaRef = blog.shloka_id ? `📖 ${blog.shloka_id.replace('BG', 'BG ')}` : '';
    const tags = blog.tags ? (typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags) : [];

    html += `
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
  });

  grid.innerHTML = html;
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
  const fixedContent = content.replace(/\\n/g, '\n');
  contentEl.innerHTML = fixedContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

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
