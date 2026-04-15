/**
 * Generate RSS/Atom feed from blog posts in the database
 * Run after: vite build, before deploy
 * Output: dist/feed.xml
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const DB_PATH = path.join(__dirname, '..', 'data', 'geetha.db');
const SLIM_DB_PATH = path.join(__dirname, '..', 'data', 'geetha-slim.db');

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function run() {
  let dbPath = null;
  if (fs.existsSync(DB_PATH)) dbPath = DB_PATH;
  else if (fs.existsSync(SLIM_DB_PATH)) dbPath = SLIM_DB_PATH;
  if (!dbPath) {
    console.log('⚠️  No database found, skipping feed generation');
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  const blogs = db.prepare(`
    SELECT b.*, s.chapter, s.verse
    FROM blogs b
    LEFT JOIN shlokas s ON b.shloka_id = s.id
    ORDER BY b.created_at DESC
    LIMIT 50
  `).all();

  if (blogs.length === 0) {
    console.log('  ⚠️  No blog posts found, skipping feed');
    db.close();
    return;
  }

  const now = new Date().toISOString();
  const latestDate = blogs[0].created_at || now;

  let feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Geetha - Bhagavad Gita Spiritual Blog</title>
  <subtitle>AI-generated life lessons connecting the Bhagavad Gita's ancient wisdom to modern life</subtitle>
  <link href="https://geetha.kprsnt.in/blog" rel="alternate"/>
  <link href="https://geetha.kprsnt.in/feed.xml" rel="self"/>
  <id>https://geetha.kprsnt.in/blog</id>
  <updated>${latestDate}</updated>
  <author>
    <name>Geetha</name>
    <uri>https://geetha.kprsnt.in</uri>
  </author>
  <icon>https://geetha.kprsnt.in/og-image.png</icon>
  <rights>Spiritual learning and personal growth</rights>
`;

  blogs.forEach(blog => {
    const id = blog.id || blog.shloka_id || 'unknown';
    const title = escapeXml(blog.title_en || 'Spiritual Insight');
    const summary = escapeXml(blog.excerpt_en || (blog.content_en || '').substring(0, 500));
    const content = escapeXml(blog.content_en || '');
    const date = blog.created_at || now;
    const shlokaRef = blog.shloka_id ? blog.shloka_id.replace('BG', 'Chapter ').replace('.', ' Verse ') : '';

    feed += `
  <entry>
    <title>${title}</title>
    <id>https://geetha.kprsnt.in/blog#post-${id}</id>
    <link href="https://geetha.kprsnt.in/blog#post-${id}" rel="alternate"/>
    <updated>${date}</updated>
    <summary>${summary}</summary>
    <content type="text">${content}</content>
    ${shlokaRef ? `<category term="${escapeXml(shlokaRef)}"/>` : ''}
    <category term="Bhagavad Gita"/>
    <category term="Spiritual"/>
  </entry>`;
  });

  feed += `
</feed>`;

  fs.writeFileSync(path.join(DIST, 'feed.xml'), feed, 'utf-8');
  db.close();
  console.log(`  ✅ feed.xml — generated with ${blogs.length} entries`);
}

run();
