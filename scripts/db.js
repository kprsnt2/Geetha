const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'geetha.db');

function initializeDatabase() {
  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create shlokas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shlokas (
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
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create blogs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS blogs (
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

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shlokas_chapter_verse ON shlokas(chapter, verse);
    CREATE INDEX IF NOT EXISTS idx_shlokas_day ON shlokas(day_number);
    CREATE INDEX IF NOT EXISTS idx_blogs_shloka ON blogs(shloka_id);
    CREATE INDEX IF NOT EXISTS idx_blogs_created ON blogs(created_at DESC);
  `);

  console.log('✅ Database initialized at', DB_PATH);
  return db;
}

function getDb() {
  return new Database(DB_PATH);
}

module.exports = { initializeDatabase, getDb, DB_PATH };
