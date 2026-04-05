/**
 * Vercel Serverless Function: GET /api/shloka?chapter=1&verse=1
 * Public API — Returns any shloka by chapter and verse
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  const dbPath = path.join(process.cwd(), 'data', 'geetha.db');
  if (!fs.existsSync(dbPath)) return null;
  const buffer = fs.readFileSync(dbPath);
  dbInstance = new SQL.Database(buffer);
  return dbInstance;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database not available' });

    const { chapter, verse } = req.query;

    // If no params, return all chapters summary
    if (!chapter) {
      const result = db.exec(`
        SELECT chapter, COUNT(*) as total_verses, 
               MIN(day_number) as start_day, MAX(day_number) as end_day
        FROM shlokas 
        GROUP BY chapter 
        ORDER BY chapter
      `);
      
      if (result.length === 0) return res.status(200).json({ chapters: [] });
      
      const cols = result[0].columns;
      const chapters = result[0].values.map(vals => {
        const obj = {};
        cols.forEach((c, i) => obj[c] = vals[i]);
        return obj;
      });

      return res.status(200).json({ chapters, totalVerses: 700 });
    }

    const ch = parseInt(chapter);
    const vs = verse ? parseInt(verse) : null;

    if (isNaN(ch) || ch < 1 || ch > 18) {
      return res.status(400).json({ error: 'Chapter must be 1-18' });
    }

    if (vs !== null) {
      // Single verse
      const shlokaId = `BG${ch}.${vs}`;
      const result = db.exec(`SELECT * FROM shlokas WHERE id = '${shlokaId}'`);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: `Verse ${shlokaId} not found` });
      }

      const cols = result[0].columns;
      const vals = result[0].values[0];
      const shloka = {};
      cols.forEach((c, i) => shloka[c] = vals[i]);

      return res.status(200).json({ shloka });
    } else {
      // All verses in chapter
      const result = db.exec(
        `SELECT id, chapter, verse, day_number, slok, transliteration, english_translation 
         FROM shlokas WHERE chapter = ${ch} ORDER BY verse`
      );
      
      if (result.length === 0) return res.status(200).json({ chapter: ch, verses: [] });
      
      const cols = result[0].columns;
      const verses = result[0].values.map(vals => {
        const obj = {};
        cols.forEach((c, i) => obj[c] = vals[i]);
        return obj;
      });

      return res.status(200).json({ chapter: ch, totalVerses: verses.length, verses });
    }
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
