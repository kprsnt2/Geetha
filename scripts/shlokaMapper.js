// Bhagavad Gita Chapter Structure
// 18 chapters, 700 verses total
const CHAPTERS = [
  { chapter: 1, verses: 47, name_en: "Arjuna Visada Yoga", name_te: "అర్జున విషాద యోగము" },
  { chapter: 2, verses: 72, name_en: "Sankhya Yoga", name_te: "సాంఖ్య యోగము" },
  { chapter: 3, verses: 43, name_en: "Karma Yoga", name_te: "కర్మ యోగము" },
  { chapter: 4, verses: 42, name_en: "Jnana Karma Sanyasa Yoga", name_te: "జ్ఞాన కర్మ సన్యాస యోగము" },
  { chapter: 5, verses: 29, name_en: "Karma Sanyasa Yoga", name_te: "కర్మ సన్యాస యోగము" },
  { chapter: 6, verses: 47, name_en: "Dhyana Yoga", name_te: "ధ్యాన యోగము" },
  { chapter: 7, verses: 30, name_en: "Jnana Vijnana Yoga", name_te: "జ్ఞాన విజ్ఞాన యోగము" },
  { chapter: 8, verses: 28, name_en: "Akshara Brahma Yoga", name_te: "అక్షర బ్రహ్మ యోగము" },
  { chapter: 9, verses: 34, name_en: "Raja Vidya Raja Guhya Yoga", name_te: "రాజ విద్యా రాజ గుహ్య యోగము" },
  { chapter: 10, verses: 42, name_en: "Vibhuti Yoga", name_te: "విభూతి యోగము" },
  { chapter: 11, verses: 55, name_en: "Viswarupa Darshana Yoga", name_te: "విశ్వరూప దర్శన యోగము" },
  { chapter: 12, verses: 20, name_en: "Bhakti Yoga", name_te: "భక్తి యోగము" },
  { chapter: 13, verses: 35, name_en: "Kshetra Kshetrajna Vibhaga Yoga", name_te: "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము" },
  { chapter: 14, verses: 27, name_en: "Gunatraya Vibhaga Yoga", name_te: "గుణత్రయ విభాగ యోగము" },
  { chapter: 15, verses: 20, name_en: "Purushottama Yoga", name_te: "పురుషోత్తమ యోగము" },
  { chapter: 16, verses: 24, name_en: "Daivasura Sampad Vibhaga Yoga", name_te: "దైవాసుర సంపద్ విభాగ యోగము" },
  { chapter: 17, verses: 28, name_en: "Shraddhatraya Vibhaga Yoga", name_te: "శ్రద్ధాత్రయ విభాగ యోగము" },
  { chapter: 18, verses: 78, name_en: "Moksha Sanyasa Yoga", name_te: "మోక్ష సన్యాస యోగము" },
];

const TOTAL_VERSES = 700;
const START_DATE = '2026-04-05'; // Day 1

/**
 * Convert a day number (1-700) to chapter and verse
 */
function dayToChapterVerse(dayNumber) {
  let remaining = dayNumber;
  for (const ch of CHAPTERS) {
    if (remaining <= ch.verses) {
      return { chapter: ch.chapter, verse: remaining, chapterName_en: ch.name_en, chapterName_te: ch.name_te };
    }
    remaining -= ch.verses;
  }
  // Should not reach here if dayNumber is 1-700
  return { chapter: 18, verse: 78, chapterName_en: CHAPTERS[17].name_en, chapterName_te: CHAPTERS[17].name_te };
}

/**
 * Get today's day number (1-700), cycling after 700
 */
function getTodayDayNumber() {
  const start = new Date(START_DATE + 'T00:00:00+05:30');
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayNumber = (diffDays % TOTAL_VERSES) + 1;
  return dayNumber;
}

/**
 * Get chapter:verse for today
 */
function getTodayShloka() {
  const dayNumber = getTodayDayNumber();
  return { dayNumber, ...dayToChapterVerse(dayNumber) };
}

/**
 * Build complete mapping of all 700 days
 */
function buildFullMapping() {
  const mapping = [];
  for (let day = 1; day <= TOTAL_VERSES; day++) {
    mapping.push({ day, ...dayToChapterVerse(day) });
  }
  return mapping;
}

module.exports = { CHAPTERS, TOTAL_VERSES, START_DATE, dayToChapterVerse, getTodayDayNumber, getTodayShloka, buildFullMapping };
