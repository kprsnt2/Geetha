/**
 * Main page — Daily Shloka
 */
import { initLanguage, initStars, initMobileNav, apiFetch, getLang, formatDate } from './utils.js';

// Chapter names for display
const CHAPTER_NAMES = {
  1: { en: "Arjuna Visada Yoga", te: "అర్జున విషాద యోగము" },
  2: { en: "Sankhya Yoga", te: "సాంఖ్య యోగము" },
  3: { en: "Karma Yoga", te: "కర్మ యోగము" },
  4: { en: "Jnana Karma Sanyasa Yoga", te: "జ్ఞాన కర్మ సన్యాస యోగము" },
  5: { en: "Karma Sanyasa Yoga", te: "కర్మ సన్యాస యోగము" },
  6: { en: "Dhyana Yoga", te: "ధ్యాన యోగము" },
  7: { en: "Jnana Vijnana Yoga", te: "జ్ఞాన విజ్ఞాన యోగము" },
  8: { en: "Akshara Brahma Yoga", te: "అక్షర బ్రహ్మ యోగము" },
  9: { en: "Raja Vidya Raja Guhya Yoga", te: "రాజ విద్యా రాజ గుహ్య యోగము" },
  10: { en: "Vibhuti Yoga", te: "విభూతి యోగము" },
  11: { en: "Viswarupa Darshana Yoga", te: "విశ్వరూప దర్శన యోగము" },
  12: { en: "Bhakti Yoga", te: "భక్తి యోగము" },
  13: { en: "Kshetra Kshetrajna Vibhaga Yoga", te: "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము" },
  14: { en: "Gunatraya Vibhaga Yoga", te: "గుణత్రయ విభాగ యోగము" },
  15: { en: "Purushottama Yoga", te: "పురుషోత్తమ యోగము" },
  16: { en: "Daivasura Sampad Vibhaga Yoga", te: "దైవాసుర సంపద్ విభాగ యోగము" },
  17: { en: "Shraddhatraya Vibhaga Yoga", te: "శ్రద్ధాత్రయ విభాగ యోగము" },
  18: { en: "Moksha Sanyasa Yoga", te: "మోక్ష సన్యాస యోగము" },
};

let currentData = null;

async function loadDailyShloka() {
  try {
    const data = await apiFetch('daily');
    currentData = data;
    renderShloka(data);
  } catch (err) {
    console.error('Failed to load shloka:', err);
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">📿</div>
        <p>Unable to load today's shloka. The database may not be ready yet.</p>
        <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">Run <code>node scripts/fetch-all-shlokas.js</code> to populate the database.</p>
      </div>
    `;
  }
}

function renderShloka(data) {
  const { shloka, blog, dayNumber, totalVerses } = data;
  const lang = getLang();

  if (!shloka) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">📿</div>
        <p>No shloka data available. Please run the fetch script first.</p>
      </div>
    `;
    return;
  }

  // Hide loading, show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('shloka-content').style.display = 'block';

  // Day number
  document.getElementById('day-number').textContent = dayNumber;

  // Chapter info
  const chName = CHAPTER_NAMES[shloka.chapter] || { en: '', te: '' };
  const chapterEl = document.getElementById('chapter-info');
  chapterEl.setAttribute('data-en', `Chapter ${shloka.chapter} — ${chName.en}`);
  chapterEl.setAttribute('data-te', `అధ్యాయం ${shloka.chapter} — ${chName.te}`);
  chapterEl.textContent = lang === 'te' 
    ? `అధ్యాయం ${shloka.chapter} — ${chName.te}` 
    : `Chapter ${shloka.chapter} — ${chName.en}`;

  // Sanskrit
  document.getElementById('sanskrit-text').textContent = shloka.slok || '';
  document.getElementById('transliteration').textContent = shloka.transliteration || '';

  // Translation
  updateTranslation(shloka, lang);

  // Progress
  const percent = ((dayNumber / totalVerses) * 100).toFixed(1);
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-percent').textContent = `${percent}%`;
  const progressStart = document.getElementById('progress-start');
  progressStart.setAttribute('data-en', `Chapter ${shloka.chapter}, Verse ${shloka.verse}`);
  progressStart.setAttribute('data-te', `అధ్యాయం ${shloka.chapter}, శ్లోకం ${shloka.verse}`);
  progressStart.textContent = lang === 'te' 
    ? `అధ్యాయం ${shloka.chapter}, శ్లోకం ${shloka.verse}` 
    : `Chapter ${shloka.chapter}, Verse ${shloka.verse}`;

  // Blog / Life Lesson
  if (blog) {
    document.getElementById('lesson-section').style.display = 'block';
    updateLesson(blog, lang);
  }
}

function updateTranslation(shloka, lang) {
  const el = document.getElementById('translation');
  const label = document.getElementById('translation-label');
  
  if (lang === 'te' && shloka.telugu_translation) {
    el.textContent = shloka.telugu_translation;
  } else {
    el.textContent = shloka.english_translation || 'Translation not available.';
  }
}

function updateLesson(blog, lang) {
  const el = document.getElementById('lesson-content');
  const content = lang === 'te' && blog.content_te ? blog.content_te : blog.content_en;
  
  if (content) {
    el.innerHTML = content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }
}

// Language change handler
window.addEventListener('langchange', (e) => {
  if (currentData) {
    const lang = e.detail.lang;
    if (currentData.shloka) updateTranslation(currentData.shloka, lang);
    if (currentData.blog) updateLesson(currentData.blog, lang);
    
    // Update chapter info
    const shloka = currentData.shloka;
    if (shloka) {
      const chName = CHAPTER_NAMES[shloka.chapter] || { en: '', te: '' };
      document.getElementById('chapter-info').textContent = lang === 'te'
        ? `అధ్యాయం ${shloka.chapter} — ${chName.te}`
        : `Chapter ${shloka.chapter} — ${chName.en}`;
      
      document.getElementById('progress-start').textContent = lang === 'te'
        ? `అధ్యాయం ${shloka.chapter}, శ్లోకం ${shloka.verse}`
        : `Chapter ${shloka.chapter}, Verse ${shloka.verse}`;
    }
  }
});

// Navigation buttons
document.getElementById('btn-prev')?.addEventListener('click', () => {
  if (!currentData?.shloka) return;
  const s = currentData.shloka;
  let ch = s.chapter, v = s.verse - 1;
  if (v < 1) {
    ch--;
    if (ch < 1) return; 
    // Get last verse of previous chapter - approximation
    const verseCounts = [0, 47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
    v = verseCounts[ch];
  }
  loadSpecificShloka(ch, v);
});

document.getElementById('btn-next')?.addEventListener('click', () => {
  if (!currentData?.shloka) return;
  const s = currentData.shloka;
  const verseCounts = [0, 47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
  let ch = s.chapter, v = s.verse + 1;
  if (v > verseCounts[ch]) {
    ch++;
    v = 1;
    if (ch > 18) return;
  }
  loadSpecificShloka(ch, v);
});

async function loadSpecificShloka(chapter, verse) {
  try {
    const data = await apiFetch(`shloka?chapter=${chapter}&verse=${verse}`);
    if (data.shloka) {
      // Calculate day number
      const verseCounts = [0, 47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
      let dayNum = 0;
      for (let i = 1; i < chapter; i++) dayNum += verseCounts[i];
      dayNum += verse;
      
      currentData = {
        dayNumber: dayNum,
        totalVerses: 700,
        shloka: data.shloka,
        blog: null,
      };
      renderShloka(currentData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('Failed to load shloka:', err);
  }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
initLanguage();
initStars();
initMobileNav();

// Check for query params from archive page
const urlParams = new URLSearchParams(window.location.search);
const qChapter = urlParams.get('ch');
const qVerse = urlParams.get('v');

if (qChapter && qVerse) {
  loadSpecificShloka(parseInt(qChapter), parseInt(qVerse));
} else {
  loadDailyShloka();
}
