/**
 * Archive page — browse all 18 chapters and 700 verses
 */
import { initLanguage, initStars, initMobileNav, apiFetch, getLang, initChatWidget } from './utils.js';

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

// Calculate today's day number
function getTodayDayNumber() {
  const start = new Date('2026-04-05T00:00:00+05:30');
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return (diff % 700) + 1;
}

function renderArchive() {
  const grid = document.getElementById('archive-grid');
  const lang = getLang();
  const todayDay = getTodayDayNumber();

  let dayCounter = 0;

  grid.innerHTML = CHAPTERS.map(ch => {
    const name = lang === 'te' ? ch.te : ch.en;
    const verseLabel = lang === 'te' ? 'శ్లోకాలు' : 'verses';

    const verses = [];
    for (let v = 1; v <= ch.verses; v++) {
      dayCounter++;
      const isCompleted = dayCounter < todayDay;
      const isToday = dayCounter === todayDay;
      const cls = isToday ? 'today' : isCompleted ? 'completed' : '';
      verses.push(`<a href="/?ch=${ch.chapter}&v=${v}" class="verse-btn ${cls}" title="Chapter ${ch.chapter}, Verse ${v}">${v}</a>`);
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

  document.getElementById('archive-loading').style.display = 'none';
}

// Language change
window.addEventListener('langchange', renderArchive);

// Init
initChatWidget();
initLanguage();
initStars();
initMobileNav();
renderArchive();
