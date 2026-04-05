/**
 * Vercel Serverless Function: GET /api/daily
 * Returns today's shloka with blog post
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Shloka mapper inline for serverless
const CHAPTERS = [
  { chapter: 1, verses: 47 }, { chapter: 2, verses: 72 }, { chapter: 3, verses: 43 },
  { chapter: 4, verses: 42 }, { chapter: 5, verses: 29 }, { chapter: 6, verses: 47 },
  { chapter: 7, verses: 30 }, { chapter: 8, verses: 28 }, { chapter: 9, verses: 34 },
  { chapter: 10, verses: 42 }, { chapter: 11, verses: 55 }, { chapter: 12, verses: 20 },
  { chapter: 13, verses: 35 }, { chapter: 14, verses: 27 }, { chapter: 15, verses: 20 },
  { chapter: 16, verses: 24 }, { chapter: 17, verses: 28 }, { chapter: 18, verses: 78 },
];
const START_DATE = '2026-04-05';
const TOTAL = 700;

function getDayNumber() {
  const start = new Date(START_DATE + 'T00:00:00+05:30');
  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const diff = Math.floor((istNow - start) / (1000 * 60 * 60 * 24));
  return (diff % TOTAL) + 1;
}

function dayToCV(day) {
  let r = day;
  for (const ch of CHAPTERS) {
    if (r <= ch.verses) return { chapter: ch.chapter, verse: r };
    r -= ch.verses;
  }
  return { chapter: 18, verse: 78 };
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  const dbPath = path.join(process.cwd(), 'data', 'geetha.db');
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  const buffer = fs.readFileSync(dbPath);
  dbInstance = new SQL.Database(buffer);
  return dbInstance;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const dayNumber = getDayNumber();
    const { chapter, verse } = dayToCV(dayNumber);
    const shlokaId = `BG${chapter}.${verse}`;

    // Get shloka
    const shlokaResult = db.exec(`SELECT * FROM shlokas WHERE id = '${shlokaId}'`);
    let shloka = null;
    if (shlokaResult.length > 0) {
      const cols = shlokaResult[0].columns;
      const vals = shlokaResult[0].values[0];
      shloka = {};
      cols.forEach((c, i) => shloka[c] = vals[i]);
    }

    // Get today's blog
    const blogResult = db.exec(`SELECT * FROM blogs WHERE shloka_id = '${shlokaId}' ORDER BY created_at DESC LIMIT 1`);
    let blog = null;
    if (blogResult.length > 0) {
      const cols = blogResult[0].columns;
      const vals = blogResult[0].values[0];
      blog = {};
      cols.forEach((c, i) => blog[c] = vals[i]);
      if (blog.tags) blog.tags = JSON.parse(blog.tags);
    }

    res.status(200).json({
      dayNumber,
      totalVerses: TOTAL,
      startDate: START_DATE,
      shloka,
      blog,
    });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
