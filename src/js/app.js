/**
 * Main page — Daily Shloka
 */
import { initLanguage, initStars, initMobileNav, apiFetch, getLang, formatDate, initChatWidget } from './utils.js';

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
  const saved = localStorage.getItem('geetha-progress');
  if (saved) {
    try {
      const { ch, v } = JSON.parse(saved);
      if (ch && v) {
        return loadSpecificShloka(ch, v);
      }
    } catch(e) {}
  }
  // Default for fresh users: Chapter 1, Verse 1
  return loadSpecificShloka(1, 1);
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
  document.getElementById('sanskrit-text').innerHTML = shloka.slok.replace(/\n/g, '<br>');
  document.getElementById('transliteration').innerHTML = shloka.transliteration.replace(/\n/g, '<br>');
  
  const translationsEl = document.getElementById('shloka-translations');
  translationsEl.innerHTML = '';
  
  if (lang === 'te' && shloka.telugu_translation) {
    translationsEl.innerHTML += `<div class="translation-block lang-content" data-lang="te"><h4>తాత్పర్యం:</h4><p>${shloka.telugu_translation}</p></div>`;
  } else if (shloka.english_translation) {
    translationsEl.innerHTML += `<div class="translation-block lang-content" data-lang="en"><h4>Translation:</h4><p>${shloka.english_translation}</p></div>`;
  }
  
  // Attach Audio Button
  if (!document.getElementById('audio-shloka-btn')) {
    const audioBtn = document.createElement('button');
    audioBtn.id = 'audio-shloka-btn';
    audioBtn.className = 'play-btn';
    audioBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
    audioBtn.style.cssText = 'position: absolute; top: -15px; right: 20px; background: var(--bg-glass); border: 1px solid var(--border-light); color: var(--primary); border-radius: 20px; padding: 4px 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;';
    translationsEl.parentElement.style.position = 'relative';
    translationsEl.parentElement.appendChild(audioBtn);
  }
  
  const playBtn = document.getElementById('audio-shloka-btn');
  playBtn.onclick = () => {
    if (window.currentAudio) {
      window.currentAudio.pause();
      if (window.currentAudio.shlokaId === shloka.id) {
        window.currentAudio = null;
        playBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
        return;
      }
    }
    // Use github's raw gita/gita dataset
    const audio = new Audio(`https://github.com/gita/gita/raw/main/data/audio/${shloka.chapter}_${shloka.verse}.mp3`);
    audio.shlokaId = shloka.id;
    window.currentAudio = audio;
    audio.play();
    playBtn.innerHTML = '⏸ <span style="font-size:0.8rem">Pause</span>';
    audio.onended = () => {
      playBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
      window.currentAudio = null;
    };
  };

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
  const lessonSection = document.getElementById('lesson-section');
  if (blog) {
    lessonSection.style.display = 'block';
    updateLesson(blog, lang);
  } else {
    lessonSection.style.display = 'none';
  }
}

function updateLesson(blog, lang) {
  const el = document.getElementById('lesson-content');
  const titleEl = document.getElementById('lesson-title');
  
  const content = lang === 'te' && blog.content_te ? blog.content_te : blog.content_en;
  const title = lang === 'te' && blog.title_te ? blog.title_te : blog.title_en;
  
  if (titleEl) titleEl.textContent = title || (lang === 'te' ? 'జీవిత పాఠం' : 'Life Lesson');
  
  if (content) {
    const fixedContent = content.replace(/\\n/g, '\n');
    el.innerHTML = fixedContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
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
    const data = await apiFetch(`daily?ch=${chapter}&v=${verse}`);
    if (data.shloka) {
      // Save global progress
      localStorage.setItem('geetha-progress', JSON.stringify({ ch: chapter, v: verse }));
      
      currentData = data;
      renderShloka(currentData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('Failed to load shloka:', err);
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">📿</div>
        <p>Unable to load the requested shloka.</p>
        <pre style="text-align:left; background:#111; color:#f88; padding:1rem; font-size:0.75rem; margin-top:1rem; overflow-x:auto;">${err.message}</pre>
      </div>
    `;
  }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
initChatWidget();
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
