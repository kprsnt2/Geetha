/**
 * Blog page — listing and detail views
 */
import { initLanguage, initStars, initMobileNav, apiFetch, getLang, formatDate, initChatWidget } from './utils.js';

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
    renderViews(allBlogs);
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

let currentViewMode = 'grid';

const CHAPTERS = [
  { chapter: 1, verses: 47, en: "Arjuna Visada Yoga", te: "అర్జున విషాద యోగము" },
  { chapter: 2, verses: 72, en: "Sankhya Yoga", te: "సాంఖ్య యోగము" },
  { chapter: 3, verses: 43, en: "Karma Yoga", te: "కర్మ యోగము" },
  { chapter: 4, verses: 42, en: "Jnana Karma Sanyasa Yoga", te: "జ్ఞాన కర్మ సన్యాస యోగము" },
  { chapter: 5, verses: 29, en: "Karma Sanyasa Yoga", te: "కర్మ సన్యాస యోగము" },
  { chapter: 6, verses: 47, en: "Dhyana Yoga", te: "ధ్యాన యోగము" },
  { chapter: 7, verses: 30, en: "Jnana Vijnana Yoga", te: "జ్ఞాన విజ్ఞాన యోగము" },
  { chapter: 8, verses: 28, en: "Akshara Brahma Yoga", te: "అక్షర బ్రహ్మ యోగము" },
  { chapter: 9, verses: 34, en: "Raja Vidya Raja Guhya Yoga", te: "రాజ విద్యా రాజ గుహ్య యోగము" },
  { chapter: 10, verses: 42, en: "Vibhuti Yoga", te: "విభూతి యోగము" },
  { chapter: 11, verses: 55, en: "Viswarupa Darshana Yoga", te: "విశ్వరూప దర్శన యోగము" },
  { chapter: 12, verses: 20, en: "Bhakti Yoga", te: "భక్తి యోగము" },
  { chapter: 13, verses: 35, en: "Kshetra Kshetrajna Vibhaga Yoga", te: "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము" },
  { chapter: 14, verses: 27, en: "Gunatraya Vibhaga Yoga", te: "గుణత్రయ విభాగ యోగము" },
  { chapter: 15, verses: 20, en: "Purushottama Yoga", te: "పురుషోత్తమ యోగము" },
  { chapter: 16, verses: 24, en: "Daivasura Sampad Vibhaga Yoga", te: "దైవాసుర సంపద్ విభాగ యోగము" },
  { chapter: 17, verses: 28, en: "Shraddhatraya Vibhaga Yoga", te: "శ్రద్ధాత్రయ విభాగ యోగము" },
  { chapter: 18, verses: 78, en: "Moksha Sanyasa Yoga", te: "మోక్ష సన్యాస యోగము" },
];

function renderViews(blogs) {
  if (currentViewMode === 'grid') {
    document.getElementById('blog-grid').style.display = 'none';
    document.getElementById('blog-grid-view').style.display = 'grid';
    renderBlogGrid(blogs);
  } else {
    document.getElementById('blog-grid-view').style.display = 'none';
    document.getElementById('blog-grid').style.display = 'grid';
    renderBlogList(blogs);
  }
}

function renderBlogGrid(blogs) {
  const grid = document.getElementById('blog-grid-view');
  const lang = getLang();

  // Create a fast lookup map for blogs by chapter-verse
  const blogMap = {};
  blogs.forEach(b => {
    if (b.chapter && b.verse) {
      blogMap[`${b.chapter}-${b.verse}`] = b.id;
    }
  });

  grid.innerHTML = CHAPTERS.map(ch => {
    const name = lang === 'te' ? ch.te : ch.en;
    const verseLabel = lang === 'te' ? 'శ్లోకాలు' : 'verses';

    const verses = [];
    for (let v = 1; v <= ch.verses; v++) {
      const blogId = blogMap[`${ch.chapter}-${v}`];
      if (blogId) {
        // Highlighted active button
        verses.push(`<button class="verse-btn" style="background: var(--primary); color: var(--bg-dark); font-weight: bold;" onclick="window.__showBlogDetail(${blogId})" title="Read Blog">${v}</button>`);
      } else {
        // Disabled empty button
        verses.push(`<button class="verse-btn" style="opacity: 0.3; cursor: not-allowed;" disabled>${v}</button>`);
      }
    }

    return `
      <div class="chapter-block">
        <div class="chapter-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
          <h3>${lang === 'te' ? 'అధ్యాయం' : 'Chapter'} ${ch.chapter} — ${name}</h3>
          <span class="verse-count">${ch.verses} ${verseLabel}</span>
        </div>
        <div class="verse-grid">${verses.join('')}</div>
      </div>
    `;
  }).join('');
}

function renderBlogList(blogs) {
  const grid = document.getElementById('blog-grid');
  const lang = getLang();

  let html = '';
  let currentChapter = -1;

  blogs.forEach(blog => {
    if (blog.chapter && blog.chapter !== currentChapter) {
      currentChapter = blog.chapter;
      const chInfo = CHAPTERS[currentChapter - 1];
      const chNameEn = `Chapter ${currentChapter} — ${chInfo.en}`;
      const chNameTe = `అధ్యాయం ${currentChapter} — ${chInfo.te}`;
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

  // Attach Speech Synthesis button
  let speechBtn = document.getElementById('audio-blog-btn');
  if (!speechBtn) {
    speechBtn = document.createElement('button');
    speechBtn.id = 'audio-blog-btn';
    speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
    speechBtn.style.cssText = 'background: var(--bg-glass); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 20px; padding: 4px 12px; cursor: pointer; float: right; margin-bottom: 1rem;';
    contentEl.parentElement.insertBefore(speechBtn, contentEl);
  }
  
  speechBtn.onclick = () => {
    if (!('speechSynthesis' in window)) return alert('Voice not supported in this browser.');
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
      return;
    }
    
    // Strip all HTML tags and use clean plain text for TTS
    const plainText = fixedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const utter = new SpeechSynthesisUtterance(plainText);
    utter.lang = lang === 'te' ? 'te-IN' : 'en-US';
    utter.rate = 0.9;
    
    // Pick the best matching voice
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      const targetVoices = voices.filter(v => v.lang.includes(lang === 'te' ? 'te' : 'en'));
      if (targetVoices.length > 0) {
        utter.voice = targetVoices[0];
      } else if (lang === 'te') {
        alert("Telugu voice isn't installed on your device. Try on an Android phone, or install Telugu in your OS settings!");
        speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
        return;
      }
    }
    
    speechBtn.innerHTML = '⏹ <span style="font-size:0.8rem">Stop Reading</span>';
    utter.onend = () => {
      speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
    };
    utter.onerror = () => {
      speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
    };
    speechSynthesis.speak(utter);
  };

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

// View Toggle
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
    });
    btn.classList.add('active');
    btn.style.background = 'var(--primary)';
    
    currentViewMode = btn.dataset.view;
    if (allBlogs.length > 0) {
      renderViews(allBlogs);
    }
  });
});

// Language change
window.addEventListener('langchange', () => {
  if (allBlogs.length > 0) {
    renderViews(allBlogs);
  }
});

// Init
initChatWidget();
initLanguage();
initStars();
initMobileNav();
loadBlogs();
