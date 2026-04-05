/**
 * Daily generation script — called by GitHub Actions
 * 1. Get today's shloka
 * 2. Generate AI blog post via Gemini
 * 3. Process any pending blog_drafts/
 * 4. Store everything in SQLite
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { getTodayShloka } = require('./shlokaMapper');
const { generateShlokaBlog, processDraft } = require('./gemini');

const DRAFTS_DIR = path.join(__dirname, '..', 'blog_drafts');
const PUBLISHED_DIR = path.join(DRAFTS_DIR, 'published');

async function generateDailyBlog() {
  const db = getDb();
  const today = getTodayShloka();
  const shlokaId = `BG${today.chapter}.${today.verse}`;

  console.log(`📅 Today is Day ${today.dayNumber}: ${shlokaId} (Chapter ${today.chapter}, Verse ${today.verse})`);

  // Check if blog already exists for today's shloka
  const existingBlog = db.prepare(
    "SELECT id FROM blogs WHERE shloka_id = ? AND type = 'ai' AND date(created_at) = date('now')"
  ).get(shlokaId);

  if (existingBlog) {
    console.log('📝 Blog already exists for today\'s shloka, skipping AI generation.');
  } else {
    // Get shloka data
    const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(shlokaId);
    if (!shloka) {
      console.error(`❌ Shloka ${shlokaId} not found in database!`);
      db.close();
      return;
    }

    console.log('🤖 Generating AI blog post via Gemini...');
    try {
      const blogData = await generateShlokaBlog(shloka);

      db.prepare(`
        INSERT INTO blogs (shloka_id, type, title_en, title_te, content_en, content_te, excerpt_en, excerpt_te, tags)
        VALUES (?, 'ai', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        shlokaId,
        blogData.title_en,
        blogData.title_te || '',
        blogData.content_en,
        blogData.content_te || '',
        blogData.excerpt_en || '',
        blogData.excerpt_te || '',
        JSON.stringify(blogData.tags || [])
      );

      console.log(`✅ Blog generated: "${blogData.title_en}"`);
    } catch (err) {
      console.error('❌ Failed to generate blog:', err.message);
    }
  }

  // Process drafts
  await processDrafts(db);

  db.close();
  console.log('🎉 Daily generation complete!');
}

async function processDrafts(db) {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
    console.log('📁 Created blog_drafts/ directory');
    return;
  }

  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }

  const files = fs.readdirSync(DRAFTS_DIR).filter(f => 
    (f.endsWith('.md') || f.endsWith('.txt')) && 
    fs.statSync(path.join(DRAFTS_DIR, f)).isFile()
  );

  if (files.length === 0) {
    console.log('📭 No new drafts to process.');
    return;
  }

  console.log(`📝 Found ${files.length} draft(s) to process...`);

  // Get today's shloka for context
  const today = getTodayShloka();
  const shlokaId = `BG${today.chapter}.${today.verse}`;
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

      // Move to published
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
