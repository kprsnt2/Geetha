/**
 * Daily generation script — called by GitHub Actions (cron + push trigger)
 *
 * Segment-aware logic:
 * 1. Load segment map (data/segments.json) — groups of verses that form complete thoughts
 * 2. Find which segment today's shloka belongs to
 * 3. Only generate a blog when today is the LAST verse of a segment
 *    → One comprehensive blog covering the entire segment
 *    → All days within the segment share this blog
 * 4. Process any pending blog_drafts/ (personal life experiences)
 * 5. Rebuild slim DB for Vercel deployment
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { getTodayDayNumber, dayToChapterVerse, CHAPTERS } = require('./shlokaMapper');
const { generateShlokaBlog, processDraft } = require('./gemini');

const DRAFTS_DIR = path.join(__dirname, '..', 'blog_drafts');
const PUBLISHED_DIR = path.join(DRAFTS_DIR, 'published');
const SEGMENTS_PATH = path.join(__dirname, '..', 'data', 'segments.json');

/**
 * Convert chapter:verse to a cumulative day number
 */
function cvToDay(chapter, verse) {
  let day = 0;
  for (const ch of CHAPTERS) {
    if (ch.chapter < chapter) {
      day += ch.verses;
    } else {
      day += verse;
      break;
    }
  }
  return day;
}

/**
 * Load segment map and find the segment for a given shloka
 */
function getSegmentForDay(dayNumber) {
  if (!fs.existsSync(SEGMENTS_PATH)) {
    console.log('⚠️ No segments.json found — using 1-verse-per-segment fallback');
    const { chapter, verse } = dayToChapterVerse(dayNumber);
    return {
      start_id: `BG${chapter}.${verse}`,
      end_id: `BG${chapter}.${verse}`,
      chapter,
      start_verse: verse,
      end_verse: verse,
      verse_count: 1,
      topic_en: '',
      topic_te: ''
    };
  }

  const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf-8'));
  const { chapter, verse } = dayToChapterVerse(dayNumber);

  for (const seg of segments) {
    if (seg.chapter === chapter && verse >= seg.start_verse && verse <= seg.end_verse) {
      return seg;
    }
  }

  // Fallback: single verse
  return {
    start_id: `BG${chapter}.${verse}`,
    end_id: `BG${chapter}.${verse}`,
    chapter,
    start_verse: verse,
    end_verse: verse,
    verse_count: 1,
    topic_en: '',
    topic_te: ''
  };
}

async function generateDailyBlog() {
  const db = getDb();
  const todayDay = getTodayDayNumber();
  const { chapter, verse } = dayToChapterVerse(todayDay);
  const todayShloka = `BG${chapter}.${verse}`;

  console.log(`📅 Today is Day ${todayDay}: ${todayShloka} (Chapter ${chapter}, Verse ${verse})`);

  // Find this shloka's segment
  const segment = getSegmentForDay(todayDay);
  const segEndDay = cvToDay(segment.chapter, segment.end_verse);
  const segStartDay = cvToDay(segment.chapter, segment.start_verse);

  console.log(`📦 Segment: ${segment.start_id} → ${segment.end_id} (${segment.verse_count} verses)`);
  if (segment.topic_en) console.log(`   Topic: ${segment.topic_en}`);

  // Check if a blog already exists for any verse in this segment
  const existingBlog = db.prepare(`
    SELECT id, shloka_id FROM blogs WHERE type = 'ai'
    AND shloka_id IN (${
      Array.from({ length: segment.end_verse - segment.start_verse + 1 }, (_, i) =>
        `'BG${segment.chapter}.${segment.start_verse + i}'`
      ).join(',')
    })
  `).get();

  if (existingBlog) {
    console.log(`✅ Blog already exists for this segment (on ${existingBlog.shloka_id}), skipping.`);
  } else if (verse > segment.start_verse) {
    // We're past the first verse — blog should already exist from day 1
    console.log(`⏳ Mid-segment — blog was expected on Day ${segStartDay} (${segment.start_id}).`);
  } else {
    // Today is the FIRST verse of the segment — generate!
    console.log(`🤖 Generating blog for segment (${segment.verse_count} verses)...`);

    // Gather all verses in the segment
    const segmentVerses = db.prepare(`
      SELECT * FROM shlokas WHERE chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse
    `).all(segment.chapter, segment.start_verse, segment.end_verse);

    if (segmentVerses.length === 0) {
      console.error('❌ No verses found for this segment!');
    } else {
      // Build combined shloka data for the blog
      const combinedShloka = {
        chapter: segment.chapter,
        verse: `${segment.start_verse}-${segment.end_verse}`,
        slok: segmentVerses.map(v => v.slok).join('\n\n'),
        transliteration: segmentVerses.map(v => v.transliteration).join('\n\n'),
        english_translation: segmentVerses.map(v => `${v.id}: ${v.english_translation}`).join('\n\n'),
        telugu_translation: segmentVerses.map(v => v.telugu_translation ? `${v.id}: ${v.telugu_translation}` : '').filter(Boolean).join('\n\n'),
        english_commentary: segmentVerses[0].english_commentary || ''
      };

      try {
        const blogData = await generateShlokaBlog(combinedShloka);

        // Store blog linked to the LAST verse of the segment (today's)
        db.prepare(`
          INSERT INTO blogs (shloka_id, type, title_en, title_te, content_en, content_te, excerpt_en, excerpt_te, tags)
          VALUES (?, 'ai', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          todayShloka,
          blogData.title_en,
          blogData.title_te || '',
          blogData.content_en,
          blogData.content_te || '',
          blogData.excerpt_en || '',
          blogData.excerpt_te || '',
          JSON.stringify(blogData.tags || [])
        );

        console.log(`✅ "${blogData.title_en}"`);
      } catch (err) {
        console.error(`❌ Blog generation failed: ${err.message}`);
      }
    }
  }

  // --- Process personal drafts ---
  await processDrafts(db);

  db.close();
  console.log('\n🎉 Daily generation complete!');
}

async function processDrafts(db) {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
    return;
  }

  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }

  const files = fs.readdirSync(DRAFTS_DIR).filter(f =>
    (f.endsWith('.md') || f.endsWith('.txt')) &&
    f !== 'README.md' &&
    fs.statSync(path.join(DRAFTS_DIR, f)).isFile()
  );

  if (files.length === 0) {
    console.log('📭 No new drafts to process.');
    return;
  }

  console.log(`\n📝 Found ${files.length} draft(s) to process...`);

  const todayDay = getTodayDayNumber();
  const { chapter, verse } = dayToChapterVerse(todayDay);
  const shlokaId = `BG${chapter}.${verse}`;
  const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(shlokaId);

  for (const file of files) {
    const filePath = path.join(DRAFTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    console.log(`  Processing: ${file}...`);
    try {
      const blogData = await processDraft(content, shloka);

      db.prepare(`
        INSERT INTO blogs (shloka_id, type, title_en, title_te, content_en, content_te, excerpt_en, excerpt_te, tags)
        VALUES (?, 'personal', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        blogData.related_shloka_id || shlokaId,
        blogData.title_en,
        blogData.title_te || '',
        blogData.content_en,
        blogData.content_te || '',
        blogData.excerpt_en || '',
        blogData.excerpt_te || '',
        JSON.stringify(blogData.tags || [])
      );

      fs.renameSync(filePath, path.join(PUBLISHED_DIR, file));
      console.log(`  ✅ Published: "${blogData.title_en}"`);
    } catch (err) {
      console.error(`  ❌ Failed to process ${file}: ${err.message}`);
    }
  }
}

generateDailyBlog().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
