/**
 * Vercel Serverless Function: GET /api/serve-blog
 * Serves blog-template.html hydrated with dynamic, SEO/GEO-optimized blog detail content.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });

  const slimDbPath = path.join(__dirname, '..', 'data', 'geetha-slim.db');
  const fullDbPath = path.join(__dirname, '..', 'data', 'geetha.db');

  let dbPath = null;
  if (fs.existsSync(slimDbPath)) dbPath = slimDbPath;
  else if (fs.existsSync(fullDbPath)) dbPath = fullDbPath;

  if (!dbPath) return null;
  const buffer = fs.readFileSync(dbPath);
  dbInstance = new SQL.Database(buffer);
  return dbInstance;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    const fallbackPath = path.join(__dirname, '..', 'dist', 'blog-template.html');

    if (!db) {
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(fs.readFileSync(fallbackPath, 'utf-8'));
      }
      return res.status(503).send('Database not available and template missing');
    }

    const blogId = parseInt(req.query.id);

    if (isNaN(blogId)) {
      // No specific blog post requested; serve default static listing template
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(fs.readFileSync(fallbackPath, 'utf-8'));
      }
      return res.status(500).send('Blog template not found.');
    }

    // Query specific blog post
    const query = `
      SELECT b.*, s.slok, s.chapter, s.verse, s.day_number
      FROM blogs b
      LEFT JOIN shlokas s ON b.shloka_id = s.id
      WHERE b.id = ${blogId}
    `;
    const result = db.exec(query);
    let blog = null;

    if (result.length > 0 && result[0].values.length > 0) {
      const cols = result[0].columns;
      const vals = result[0].values[0];
      blog = {};
      cols.forEach((c, i) => blog[c] = vals[i]);
    }

    if (!blog) {
      // Blog not found: serve general list page
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(fs.readFileSync(fallbackPath, 'utf-8'));
      }
      return res.status(404).send('Blog post not found.');
    }

    // Read template
    if (!fs.existsSync(fallbackPath)) {
      return res.status(500).send('Blog template file not found.');
    }
    let html = fs.readFileSync(fallbackPath, 'utf-8');

    // Format fields
    const dateStr = new Date(blog.created_at).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const title = blog.title_en || 'Spiritual Wisdom';
    const titleTe = blog.title_te || '';
    const pageTitle = `${title} ${titleTe ? `(${titleTe})` : ''} — Bhagavad Gita Life Lessons | Geetha`;
    const description = blog.excerpt_en || (blog.content_en || '').substring(0, 155).replace(/\n/g, ' ') + '...';
    const pageUrl = `https://geetha.kprsnt.in/blog?id=${blog.id}`;

    // ─────────────────────────────────────────────
    // Metadata replacements
    // ─────────────────────────────────────────────
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageTitle}</title>`);
    html = html.replace(/<meta property="og:title" content=".*?">/gi, `<meta property="og:title" content="${pageTitle}">`);
    html = html.replace(/<meta name="twitter:title" content=".*?">/gi, `<meta name="twitter:title" content="${pageTitle}">`);

    html = html.replace(/<meta name="description" content=".*?">/gi, `<meta name="description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:description" content=".*?">/gi, `<meta property="og:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta name="twitter:description" content=".*?">/gi, `<meta name="twitter:description" content="${escapeHtml(description)}">`);

    html = html.replace(/<link rel="canonical" href=".*?">/gi, `<link rel="canonical" href="${pageUrl}">`);
    html = html.replace(/<meta property="og:url" content=".*?">/gi, `<meta property="og:url" content="${pageUrl}">`);

    // Alternates
    html = html.replace(/<link rel="alternate" hreflang="en" href=".*?">/gi, `<link rel="alternate" hreflang="en" href="${pageUrl}">`);
    html = html.replace(/<link rel="alternate" hreflang="te" href=".*?">/gi, `<link rel="alternate" hreflang="te" href="${pageUrl}">`);
    html = html.replace(/<link rel="alternate" hreflang="x-default" href=".*?">/gi, `<link rel="alternate" hreflang="x-default" href="${pageUrl}">`);

    // ─────────────────────────────────────────────
    // Structured Data (JSON-LD) replacements
    // ─────────────────────────────────────────────
    const schemaBlog = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "alternativeHeadline": titleTe || undefined,
      "description": description,
      "datePublished": blog.created_at,
      "inLanguage": ["en", "te"],
      "author": {
        "@type": "Organization",
        "name": "Geetha"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Geetha",
        "url": "https://geetha.kprsnt.in"
      },
      "mainEntityOfPage": pageUrl,
      "articleBody": blog.content_en,
      "about": blog.shloka_id ? {
        "@type": "Thing",
        "name": `Bhagavad Gita ${blog.shloka_id.replace('BG', 'Chapter ').replace('.', ' Verse ')}`
      } : undefined
    };

    const schemaBreadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://geetha.kprsnt.in/" },
        { "@type": "ListItem", "position": 2, "name": "Spiritual Blog", "item": "https://geetha.kprsnt.in/blog" },
        { "@type": "ListItem", "position": 3, "name": title, "item": pageUrl }
      ]
    };

    html = html.replace(/<script type="application\/ld\+json" id="schema-blog">[\s\S]*?<\/script>/i, 
      `<script type="application/ld+json" id="schema-blog">${JSON.stringify(schemaBlog, null, 2)}</script>`);

    html = html.replace(/<script type="application\/ld\+json" id="schema-breadcrumb">[\s\S]*?<\/script>/i, 
      `<script type="application/ld+json" id="schema-breadcrumb">${JSON.stringify(schemaBreadcrumb, null, 2)}</script>`);

    // ─────────────────────────────────────────────
    // Pre-rendered Blog Content Replacement
    // ─────────────────────────────────────────────
    const cleanContentEn = (blog.content_en || '').replace(/\\n/g, '\n');
    const cleanContentTe = (blog.content_te || '').replace(/\\n/g, '\n');

    const prerenderBlock = `
    <!-- PRE-RENDERED BLOG DETAIL (for crawlers & SEO) -->
    <section id="prerendered-blog-detail" class="sr-only" aria-hidden="false" itemscope itemtype="https://schema.org/BlogPosting">
      <meta itemprop="inLanguage" content="en, te">
      <h2 itemprop="headline">${escapeHtml(title)}</h2>
      ${titleTe ? `<h3 lang="te">${escapeHtml(titleTe)}</h3>` : ''}
      <time itemprop="datePublished" datetime="${blog.created_at}">${dateStr}</time>
      ${blog.shloka_id ? `<p>Based on Bhagavad Gita: <a href="https://geetha.kprsnt.in/?ch=${blog.chapter}&amp;v=${blog.verse}">${blog.shloka_id.replace('BG', 'Chapter ').replace('.', ' Verse ')}</a></p>` : ''}
      
      <div itemprop="articleBody">
        <h4>English Interpretation</h4>
        <p>${escapeHtml(cleanContentEn).split('\n\n').join('</p><p>')}</p>
        
        ${cleanContentTe ? `
        <h4 lang="te">తెలుగు అనువాదం &amp; తాత్పర్యం</h4>
        <p lang="te">${escapeHtml(cleanContentTe).split('\n\n').join('</p><p>')}</p>` : ''}
      </div>

      <footer>
        <p>Read more Bhagavad Gita life notes and AI spiritual insights at <a href="https://geetha.kprsnt.in/blog">Geetha Blog</a>.</p>
      </footer>
    </section>
    <!-- END PRE-RENDERED BLOG DETAIL -->`;

    // Replace the built-time prerendered list section with this specific post's section
    html = html.replace(/<!-- PRE-RENDERED BLOG LIST[\s\S]*?<!-- END PRE-RENDERED BLOG LIST -->/i, prerenderBlock);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (err) {
    console.error('Serve Blog Error:', err);
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
};
