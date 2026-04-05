/**
 * Create a slim production database by removing the raw_json column
 * This reduces the database from ~36MB to ~20MB for Vercel deployment
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SRC_PATH = path.join(__dirname, '..', 'data', 'geetha.db');
const DEST_PATH = path.join(__dirname, '..', 'data', 'geetha-slim.db');

// Remove existing slim DB if present
if (fs.existsSync(DEST_PATH)) {
  fs.unlinkSync(DEST_PATH);
}

const src = new Database(SRC_PATH, { readonly: true });
const dest = new Database(DEST_PATH);

// Create tables without raw_json
dest.exec(`
  CREATE TABLE shlokas (
    id TEXT PRIMARY KEY,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    day_number INTEGER UNIQUE NOT NULL,
    slok TEXT,
    transliteration TEXT,
    english_translation TEXT,
    english_commentary TEXT,
    hindi_translation TEXT,
    telugu_translation TEXT,
    telugu_commentary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

dest.exec(`
  CREATE TABLE blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shloka_id TEXT,
    type TEXT CHECK(type IN ('ai','personal')) NOT NULL,
    title_en TEXT NOT NULL,
    title_te TEXT,
    content_en TEXT NOT NULL,
    content_te TEXT,
    excerpt_en TEXT,
    excerpt_te TEXT,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shloka_id) REFERENCES shlokas(id)
  );
`);

dest.exec(`
  CREATE INDEX idx_shlokas_chapter_verse ON shlokas(chapter, verse);
  CREATE INDEX idx_shlokas_day ON shlokas(day_number);
  CREATE INDEX idx_blogs_shloka ON blogs(shloka_id);
  CREATE INDEX idx_blogs_created ON blogs(created_at DESC);
`);

// Copy shlokas without raw_json
const insertShloka = dest.prepare(`
  INSERT INTO shlokas (id, chapter, verse, day_number, slok, transliteration, 
    english_translation, english_commentary, hindi_translation, telugu_translation, 
    telugu_commentary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const shlokas = src.prepare(`
  SELECT id, chapter, verse, day_number, slok, transliteration, 
    english_translation, english_commentary, hindi_translation, telugu_translation, 
    telugu_commentary, created_at
  FROM shlokas ORDER BY day_number
`).all();

const insertMany = dest.transaction((rows) => {
  for (const r of rows) {
    insertShloka.run(r.id, r.chapter, r.verse, r.day_number, r.slok, r.transliteration,
      r.english_translation, r.english_commentary, r.hindi_translation, r.telugu_translation,
      r.telugu_commentary, r.created_at);
  }
});
insertMany(shlokas);

// Copy blogs
const blogs = src.prepare('SELECT * FROM blogs').all();
if (blogs.length > 0) {
  const insertBlog = dest.prepare(`
    INSERT INTO blogs (id, shloka_id, type, title_en, title_te, content_en, content_te, 
      excerpt_en, excerpt_te, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBlogs = dest.transaction((rows) => {
    for (const b of rows) {
      insertBlog.run(b.id, b.shloka_id, b.type, b.title_en, b.title_te, b.content_en,
        b.content_te, b.excerpt_en, b.excerpt_te, b.tags, b.created_at);
    }
  });
  insertBlogs(blogs);
}

src.close();

// VACUUM for minimum size
dest.exec('VACUUM');
dest.close();

const srcSize = fs.statSync(SRC_PATH).size;
const destSize = fs.statSync(DEST_PATH).size;
console.log(`✅ Slim database created:`);
console.log(`   Original: ${(srcSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Slim:     ${(destSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Saved:    ${((srcSize - destSize) / 1024 / 1024).toFixed(2)} MB (${((1 - destSize/srcSize) * 100).toFixed(1)}%)`);
console.log(`   Shlokas:  ${shlokas.length}`);
console.log(`   Blogs:    ${blogs.length}`);
