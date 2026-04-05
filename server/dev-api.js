/**
 * Local development API server
 * Mirrors Vercel serverless functions for local dev
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { getTodayShloka } = require('../scripts/shlokaMapper');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, '..', 'data', 'geetha.db');

app.use(cors());
app.use(express.json());

function getDb() {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch (err) {
    console.error('Database not found. Run: npm run init-db && npm run fetch-shlokas');
    return null;
  }
}

// GET /api/daily — Today's shloka + blog
app.get('/api/daily', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const today = getTodayShloka();
    const shlokaId = `BG${today.chapter}.${today.verse}`;

    const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(shlokaId);
    const blog = db.prepare(
      "SELECT * FROM blogs WHERE shloka_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(shlokaId);

    if (blog && blog.tags) blog.tags = JSON.parse(blog.tags);

    res.json({
      dayNumber: today.dayNumber,
      totalVerses: 700,
      startDate: '2026-04-05',
      shloka: shloka || null,
      blog: blog || null,
    });
  } finally {
    db.close();
  }
});

// GET /api/shloka?chapter=X&verse=Y — specific shloka or chapter list
app.get('/api/shloka', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const { chapter, verse } = req.query;

    if (!chapter) {
      const chapters = db.prepare(`
        SELECT chapter, COUNT(*) as total_verses, 
               MIN(day_number) as start_day, MAX(day_number) as end_day
        FROM shlokas GROUP BY chapter ORDER BY chapter
      `).all();
      return res.json({ chapters, totalVerses: 700 });
    }

    const ch = parseInt(chapter);
    if (isNaN(ch) || ch < 1 || ch > 18) {
      return res.status(400).json({ error: 'Chapter must be 1-18' });
    }

    if (verse) {
      const shlokaId = `BG${ch}.${parseInt(verse)}`;
      const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(shlokaId);
      if (!shloka) return res.status(404).json({ error: `Verse ${shlokaId} not found` });
      return res.json({ shloka });
    }

    const verses = db.prepare(
      'SELECT id, chapter, verse, day_number, slok, transliteration, english_translation FROM shlokas WHERE chapter = ? ORDER BY verse'
    ).all(ch);
    res.json({ chapter: ch, totalVerses: verses.length, verses });
  } finally {
    db.close();
  }
});

// GET /api/blogs — list all blogs
app.get('/api/blogs', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const offset = (page - 1) * limit;

    let where = '';
    const params = [];
    if (type === 'ai' || type === 'personal') {
      where = 'WHERE b.type = ?';
      params.push(type);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM blogs b ${where}`).get(...params).count;

    const blogs = db.prepare(`
      SELECT b.*, s.slok, s.chapter, s.verse, s.day_number
      FROM blogs b
      LEFT JOIN shlokas s ON b.shloka_id = s.id
      ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    blogs.forEach(b => { if (b.tags) b.tags = JSON.parse(b.tags); });

    res.json({
      blogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } finally {
    db.close();
  }
});

app.listen(PORT, () => {
  console.log(`🙏 Geetha API server running at http://localhost:${PORT}`);
  console.log(`   Endpoints: /api/daily, /api/shloka, /api/blogs`);
});
