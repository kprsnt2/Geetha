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
let previousChapter = null;
let previousBlogId = null;

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

  // Detect chapter change and show banner
  if (previousChapter !== null && shloka.chapter !== previousChapter) {
    showNewChapterBanner(shloka.chapter, lang);
  }
  previousChapter = shloka.chapter;

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
  
  // Attach Audio Button — uses Web Speech API to read transliteration + translation
  const playBtn = document.getElementById('audio-shloka-btn');
  if (playBtn) {
    playBtn.style.display = 'flex';
    playBtn.onclick = () => {
      if (!('speechSynthesis' in window)) return alert('Voice not supported in this browser.');

      // Toggle off if already speaking
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        playBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
        return;
      }

      // Read the transliteration (romanised Sanskrit) and the translation
      const translitText = (shloka.transliteration || '').replace(/\n/g, '. ');
      const transText = lang === 'te' && shloka.telugu_translation
        ? shloka.telugu_translation
        : (shloka.english_translation || '');
      const fullText = translitText + '. . . ' + transText;

      const utter = new SpeechSynthesisUtterance(fullText);
      utter.lang = lang === 'te' ? 'te-IN' : 'en-US';
      utter.rate = 0.85;

      // Pick the best matching voice
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const query = lang === 'te' ? 'te' : 'en';
        const targetVoices = voices.filter(v => 
          v.lang.toLowerCase().includes(query) || 
          (lang === 'te' && v.lang.toLowerCase().includes('tel'))
        );
        if (targetVoices.length > 0) {
          utter.voice = targetVoices[0];
        }
      }

      playBtn.innerHTML = '⏸ <span style="font-size:0.8rem">Stop</span>';
      utter.onend = () => {
        playBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
      };
      utter.onerror = () => {
        playBtn.innerHTML = '🔊 <span style="font-size:0.8rem">Listen</span>';
      };
      speechSynthesis.speak(utter);
    };
  }

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

    // Detect new blog and show indicator
    const blogKey = blog.id || blog.title_en || `${shloka.chapter}-${shloka.verse}`;
    if (previousBlogId !== null && blogKey !== previousBlogId) {
      showNewBlogIndicator(lang);
    }
    previousBlogId = blogKey;
  } else {
    lessonSection.style.display = 'none';
    previousBlogId = null;
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

    // Attach Speech Synthesis button
    let speechBtn = document.getElementById('audio-lesson-btn');
    if (!speechBtn) {
      speechBtn = document.createElement('button');
      speechBtn.id = 'audio-lesson-btn';
      speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
      speechBtn.style.cssText = 'background: var(--bg-glass); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 20px; padding: 4px 12px; cursor: pointer; float: right; margin-bottom: 1rem;';
      el.parentElement.insertBefore(speechBtn, el);
    }
    
    speechBtn.onclick = () => {
      if (!('speechSynthesis' in window)) return alert('Voice not supported in this browser.');
      
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        speechBtn.innerHTML = '🗣️ <span style="font-size:0.8rem">Read Aloud</span>';
        return;
      }
      
      // Strip all HTML and use plain text for TTS
      const plainText = fixedContent.replace(/\\n/g, '\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const utter = new SpeechSynthesisUtterance(plainText);
      utter.lang = lang === 'te' ? 'te-IN' : 'en-US';
      utter.rate = 0.9;
      
      // Pick the best matching voice
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const query = lang === 'te' ? 'te' : 'en';
        const targetVoices = voices.filter(v => 
          v.lang.toLowerCase().includes(query) || 
          (lang === 'te' && v.lang.toLowerCase().includes('tel'))
        );
        if (targetVoices.length > 0) {
          utter.voice = targetVoices[0];
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
  }
}

// Language change handler
window.addEventListener('langchange', () => {
  if (currentData) {
    renderShloka(currentData);
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

// ═══════════════════════════════════════════
// NEW CHAPTER BANNER
// ═══════════════════════════════════════════
function showNewChapterBanner(chapter, lang) {
  // Remove any existing banner
  const existing = document.getElementById('new-chapter-banner');
  if (existing) existing.remove();

  const chName = CHAPTER_NAMES[chapter] || { en: '', te: '' };
  const titleText = lang === 'te'
    ? `✦ క్రొత్త అధ్యాయం — అధ్యాయం ${chapter}`
    : `✦ New Chapter — Chapter ${chapter}`;
  const subtitleText = lang === 'te' ? chName.te : chName.en;

  const banner = document.createElement('div');
  banner.id = 'new-chapter-banner';
  banner.innerHTML = `
    <div class="ncb-glow"></div>
    <div class="ncb-content">
      <div class="ncb-badge">NEW</div>
      <div class="ncb-title">${titleText}</div>
      <div class="ncb-subtitle">${subtitleText}</div>
    </div>
  `;

  // Inject styles if not already present
  if (!document.getElementById('ncb-styles')) {
    const style = document.createElement('style');
    style.id = 'ncb-styles';
    style.textContent = `
      #new-chapter-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        animation: ncbFadeIn 0.4s ease-out forwards, ncbFadeOut 0.5s ease-in 2.8s forwards;
      }
      .ncb-glow {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(ellipse at center, rgba(212, 168, 67, 0.12) 0%, transparent 70%);
        animation: ncbGlowPulse 1.5s ease-in-out;
      }
      .ncb-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 28px 48px;
        background: linear-gradient(145deg, rgba(20, 20, 50, 0.95) 0%, rgba(10, 10, 30, 0.97) 100%);
        border: 1px solid rgba(212, 168, 67, 0.4);
        border-radius: 20px;
        backdrop-filter: blur(24px);
        box-shadow: 0 0 60px rgba(212, 168, 67, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: ncbSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        transform: translateY(30px);
      }
      .ncb-badge {
        display: inline-block;
        padding: 3px 14px;
        background: linear-gradient(135deg, #ff6b35, #ff8f62);
        color: #0a0a1a;
        font-family: 'Outfit', sans-serif;
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        border-radius: 9999px;
        text-transform: uppercase;
        animation: ncbBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
      }
      .ncb-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.4rem;
        font-weight: 700;
        color: #f0d080;
        text-align: center;
        text-shadow: 0 0 20px rgba(212, 168, 67, 0.3);
      }
      .ncb-subtitle {
        font-family: 'Outfit', 'Noto Sans Telugu', sans-serif;
        font-size: 1rem;
        color: #a29bfe;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      @keyframes ncbFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ncbFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes ncbSlideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes ncbGlowPulse {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes ncbBadgePop {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }
      @media (max-width: 480px) {
        .ncb-content { padding: 20px 28px; }
        .ncb-title { font-size: 1.15rem; }
        .ncb-subtitle { font-size: 0.85rem; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Auto-remove after animation completes
  setTimeout(() => {
    banner.remove();
  }, 3500);
}

// ═══════════════════════════════════════════
// NEW BLOG / LIFE LESSON INDICATOR
// ═══════════════════════════════════════════
function showNewBlogIndicator(lang) {
  // Remove any existing indicator
  const existing = document.getElementById('new-blog-indicator');
  if (existing) existing.remove();

  const pill = document.createElement('div');
  pill.id = 'new-blog-indicator';
  pill.innerHTML = lang === 'te'
    ? '📖 క్రొత్త కథ — చదవడానికి క్లిక్ చేయండి ↓'
    : '📖 New Story Below — Tap to read ↓';
  pill.title = 'Scroll to life lesson';

  pill.addEventListener('click', () => {
    const lesson = document.getElementById('lesson-section');
    if (lesson) {
      lesson.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Flash highlight the lesson card
      const card = lesson.querySelector('.lesson-card');
      if (card) {
        card.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
        card.style.boxShadow = '0 0 30px rgba(255, 107, 53, 0.3)';
        card.style.borderColor = 'rgba(255, 107, 53, 0.5)';
        setTimeout(() => {
          card.style.boxShadow = '';
          card.style.borderColor = '';
        }, 2000);
      }
    }
    pill.remove();
  });

  // Inject styles if not already present
  if (!document.getElementById('nbi-styles')) {
    const style = document.createElement('style');
    style.id = 'nbi-styles';
    style.textContent = `
      #new-blog-indicator {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        padding: 10px 24px;
        background: linear-gradient(135deg, rgba(20, 20, 50, 0.95), rgba(10, 10, 30, 0.97));
        border: 1px solid rgba(255, 107, 53, 0.5);
        border-radius: 9999px;
        color: #ff8f62;
        font-family: 'Outfit', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        pointer-events: auto;
        backdrop-filter: blur(16px);
        box-shadow: 0 0 24px rgba(255, 107, 53, 0.15), 0 8px 24px rgba(0, 0, 0, 0.4);
        animation: nbiFadeSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                   nbiBounce 2s ease-in-out 0.6s infinite,
                   nbiFadeOut 0.4s ease-in 7.5s forwards;
        white-space: nowrap;
      }
      #new-blog-indicator:hover {
        border-color: rgba(255, 107, 53, 0.8);
        box-shadow: 0 0 36px rgba(255, 107, 53, 0.25), 0 8px 24px rgba(0, 0, 0, 0.5);
        color: #ffb088;
      }
      @keyframes nbiFadeSlideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes nbiBounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-6px); }
      }
      @keyframes nbiFadeOut {
        from { opacity: 1; }
        to { opacity: 0; pointer-events: none; }
      }
      @media (max-width: 480px) {
        #new-blog-indicator {
          font-size: 0.8rem;
          padding: 8px 18px;
          bottom: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(pill);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (pill.parentElement) pill.remove();
  }, 8000);
}

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
