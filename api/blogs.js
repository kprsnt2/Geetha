/**
 * Vercel Serverless Function: GET /api/blogs
 * Returns all published blog posts (paginated)
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

function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    if (obj.tags) obj.tags = JSON.parse(obj.tags);
    return obj;
  });
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database not available' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // 'ai' or 'personal'
    const offset = (page - 1) * limit;

    let where = '';
    if (type === 'ai' || type === 'personal') {
      where = `WHERE type = '${type}'`;
    }

    const countResult = db.exec(`SELECT COUNT(*) as total FROM blogs ${where}`);
    const total = countResult[0]?.values[0]?.[0] || 0;

    const blogsResult = db.exec(
      `SELECT b.*, s.slok, s.chapter, s.verse, s.day_number 
       FROM blogs b 
       LEFT JOIN shlokas s ON b.shloka_id = s.id 
       ${where} 
       ORDER BY b.created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`
    );

    const blogs = rowsToObjects(blogsResult);

    res.status(200).json({
      blogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
