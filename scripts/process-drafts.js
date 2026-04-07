/**
 * Process personal blog drafts — called by GitHub Actions (push trigger)
 * 
 * Logic:
 * 1. Process any pending blog_drafts/ (personal life experiences)
 * 2. Rebuild slim DB for Vercel deployment
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { getTodayDayNumber, dayToChapterVerse } = require('./shlokaMapper');
const { processDraft } = require('./gemini');

const DRAFTS_DIR = path.join(__dirname, '..', 'blog_drafts');
const PUBLISHED_DIR = path.join(DRAFTS_DIR, 'published');

async function processDraftsAndPublish() {
  const db = getDb();
  
  // --- Process personal drafts ---
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
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
    db.close();
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

  db.close();
  console.log('\n🎉 Drafts processing complete!');
}

processDraftsAndPublish().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
