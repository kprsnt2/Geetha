/**
 * Post-build pre-rendering script
 * Reads from the SQLite DB and injects static, crawlable content into dist/ HTML files.
 * This makes the site content visible to Google, LLMs, and AI crawlers.
 *
 * Run after: vite build
 * Usage:   node scripts/prerender.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const DB_PATH = path.join(__dirname, '..', 'data', 'geetha.db');
const SLIM_DB_PATH = path.join(__dirname, '..', 'data', 'geetha-slim.db');

const CHAPTERS = [
  { chapter: 1, verses: 47, en: "Arjuna Visada Yoga", te: "అర్జున విషాద యోగము" },
  { chapter: 2, verses: 72, en: "Sankhya Yoga", te: "సాంఖ్య యోగము" },
  { chapter: 3, verses: 43, en: "Karma Yoga", te: "కర్మ యోగము" },
  { chapter: 4, verses: 42, en: "Jnana Karma Sanyasa Yoga", te: "జ్ఞాన కర్మ సన్యాస యోగము" },
  { chapter: 5, verses: 29, en: "Karma Sanyasa Yoga", te: "కర్మ సన్యాస యోగము" },
  { chapter: 6, verses: 47, en: "Dhyana Yoga", te: "ధ్యాన యోగము" },
  { chapter: 7, verses: 30, en: "Jnana Vijnana Yoga", te: "జ్ఞాన విజ్ఞాన యోగము" },
  { chapter: 8, verses: 28, en: "Akshara Brahma Yoga", te: "అక్షర బ్రహ్మ యోగము" },
  { chapter: 9, verses: 34, en: "Raja Vidya Raja Guhya Yoga", te: "రాజ విద్యా రాజ గుహ్య యోగము" },
  { chapter: 10, verses: 42, en: "Vibhuti Yoga", te: "విభూతి యోగము" },
  { chapter: 11, verses: 55, en: "Viswarupa Darshana Yoga", te: "విశ్వరూప దర్శన యోగము" },
  { chapter: 12, verses: 20, en: "Bhakti Yoga", te: "భక్తి యోగము" },
  { chapter: 13, verses: 35, en: "Kshetra Kshetrajna Vibhaga Yoga", te: "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము" },
  { chapter: 14, verses: 27, en: "Gunatraya Vibhaga Yoga", te: "గుణత్రయ విభాగ యోగము" },
  { chapter: 15, verses: 20, en: "Purushottama Yoga", te: "పురుషోత్తమ యోగము" },
  { chapter: 16, verses: 24, en: "Daivasura Sampad Vibhaga Yoga", te: "దైవాసుర సంపద్ విభాగ యోగము" },
  { chapter: 17, verses: 28, en: "Shraddhatraya Vibhaga Yoga", te: "శ్రద్ధాత్రయ విభాగ యోగము" },
  { chapter: 18, verses: 78, en: "Moksha Sanyasa Yoga", te: "మోక్ష సన్యాస యోగము" },
];

const START_DATE = '2026-04-05';
const TOTAL = 700;

function getDayNumber() {
  const start = new Date(START_DATE + 'T00:00:00+05:30');
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function run() {
  // Open DB
  let dbPath = null;
  if (fs.existsSync(DB_PATH)) dbPath = DB_PATH;
  else if (fs.existsSync(SLIM_DB_PATH)) dbPath = SLIM_DB_PATH;

  if (!dbPath) {
    console.log('⚠️  No database found, skipping pre-render');
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  console.log('📄 Pre-rendering static content into dist/ HTML files...');

  // ─────────────────────────────────────────────
  // 1. INDEX.HTML — Inject today's shloka
  // ─────────────────────────────────────────────
  const dayNumber = getDayNumber();
  const { chapter, verse } = dayToCV(dayNumber);
  const shlokaId = `BG${chapter}.${verse}`;
  const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(shlokaId);
  const chName = CHAPTERS[chapter - 1];

  if (shloka) {
    const indexPath = path.join(DIST, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');

    // Build a crawlable content block
    const prerenderBlock = `
    <!-- PRE-RENDERED CONTENT (for crawlers & SEO) -->
    <section id="prerendered-shloka" class="sr-only" aria-hidden="false" itemscope itemtype="https://schema.org/Article">
      <meta itemprop="name" content="Bhagavad Gita Chapter ${chapter} Verse ${verse}">
      <meta itemprop="author" content="Vyasa">
      <meta itemprop="inLanguage" content="sa, en, te">
      <h2>Bhagavad Gita — Chapter ${chapter}, Verse ${verse}</h2>
      <h3>${chName.en} (${chName.te})</h3>
      <p><strong>Day ${dayNumber} of 700</strong></p>

      <h4>Sanskrit (Original)</h4>
      <blockquote lang="sa" itemprop="text">${escapeHtml(shloka.slok)}</blockquote>

      <h4>Transliteration</h4>
      <p><em>${escapeHtml(shloka.transliteration)}</em></p>

      <h4>English Translation</h4>
      <p itemprop="description">${escapeHtml(shloka.english_translation)}</p>

      ${shloka.telugu_translation ? `
      <h4>Telugu Translation (తెలుగు అనువాదం/తాత్పర్యం)</h4>
      <p lang="te"><strong>భగవద్గీత తెలుగు అనువాదం:</strong> ${escapeHtml(shloka.telugu_translation)}</p>
      ` : ''}

      <footer>
        <p>Read all 700 verses of the Bhagavad Gita at <a href="https://geetha.kprsnt.in/">Geetha</a>.
        <a href="https://geetha.kprsnt.in/archive">Browse all 18 chapters</a> |
        <a href="https://geetha.kprsnt.in/blog">Read spiritual blog posts</a></p>
      </footer>
    </section>
    <!-- END PRE-RENDERED CONTENT -->`;

    // Also inject a visible <noscript> fallback
    const noscriptBlock = `
    <noscript>
      <style>.hero .loading { display: none !important; } #noscript-shloka { display: block !important; }</style>
      <article id="noscript-shloka" style="max-width: 800px; margin: 120px auto; padding: 2rem; text-align: center;">
        <h2 style="color: #d4a843;">Bhagavad Gita — Chapter ${chapter}, Verse ${verse}</h2>
        <p style="color: #a29bfe;">${chName.en}</p>
        <blockquote style="color: #f0d080; font-size: 1.3rem; margin: 1.5rem 0; line-height: 2; font-family: 'Noto Sans Devanagari', serif;">${escapeHtml(shloka.slok)}</blockquote>
        <p style="color: #9896a8; font-style: italic;">${escapeHtml(shloka.transliteration)}</p>
        <p style="color: #e8e6f0; margin-top: 1rem;">${escapeHtml(shloka.english_translation)}</p>
        ${shloka.telugu_translation ? `<p style="color: #e8e6f0; margin-top: 1rem;">${escapeHtml(shloka.telugu_translation)}</p>` : ''}
        <p style="margin-top: 2rem;"><a href="/archive" style="color: #d4a843;">Browse all 700 verses →</a></p>
      </article>
    </noscript>`;

    // Inject before </main>
    html = html.replace('</main>', prerenderBlock + '\n' + noscriptBlock + '\n  </main>');

    // Update the <title> to include today's verse
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>Bhagavad Gita Chapter ${chapter} Verse ${verse} — ${chName.en} | Daily Shloka in Telugu & English | Geetha</title>`
    );

    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log(`  ✅ index.html — injected ${shlokaId} (Day ${dayNumber})`);
  }

  // ─────────────────────────────────────────────
  // 2. BLOG.HTML — Inject blog excerpts
  // ─────────────────────────────────────────────
  const blogs = db.prepare(`
    SELECT b.*, s.chapter, s.verse
    FROM blogs b
    LEFT JOIN shlokas s ON b.shloka_id = s.id
    ORDER BY b.created_at DESC
    LIMIT 20
  `).all();

  if (blogs.length > 0) {
    const blogPath = path.join(DIST, 'blog.html');
    let html = fs.readFileSync(blogPath, 'utf-8');

    let blogListHtml = `
    <!-- PRE-RENDERED BLOG LIST (for crawlers & SEO) -->
    <section id="prerendered-blogs" class="sr-only" aria-hidden="false">
      <h2>Recent Spiritual Blog Posts from the Bhagavad Gita</h2>
      <p>AI-generated life lessons and spiritual insights connecting the Bhagavad Gita's ancient wisdom to modern life. Available in English and Telugu.</p>
      <ul>`;

    blogs.forEach(blog => {
      const date = new Date(blog.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      blogListHtml += `
        <li itemscope itemtype="https://schema.org/BlogPosting">
          <h3 itemprop="headline">${escapeHtml(blog.title_en)}</h3>
          ${blog.title_te ? `<h4 lang="te">${escapeHtml(blog.title_te)}</h4>` : ''}
          <time itemprop="datePublished" datetime="${blog.created_at}">${date}</time>
          <p itemprop="description">${escapeHtml(blog.excerpt_en || (blog.content_en || '').substring(0, 300))}</p>
          ${blog.excerpt_te ? `<p lang="te"><strong>Telugu Summary (తెలుగు సారాంశం):</strong> ${escapeHtml(blog.excerpt_te)}</p>` : ''}
          ${blog.shloka_id ? `<p>Based on ${blog.shloka_id.replace('BG', 'Bhagavad Gita ')}</p>` : ''}
        </li>`;
    });

    blogListHtml += `
      </ul>
      <p>Read more at <a href="https://geetha.kprsnt.in/blog">Geetha Spiritual Blog</a></p>
    </section>
    <!-- END PRE-RENDERED BLOG LIST -->`;

    html = html.replace('</main>', blogListHtml + '\n  </main>');
    fs.writeFileSync(blogPath, html, 'utf-8');
    console.log(`  ✅ blog.html — injected ${blogs.length} blog excerpts`);
  }

  // ─────────────────────────────────────────────
  // 3. ARCHIVE.HTML — Inject chapter listing
  // ─────────────────────────────────────────────
  const archivePath = path.join(DIST, 'archive.html');
  let archiveHtml = fs.readFileSync(archivePath, 'utf-8');

  let chapterListHtml = `
    <!-- PRE-RENDERED ARCHIVE (for crawlers & SEO) -->
    <section id="prerendered-archive" class="sr-only" aria-hidden="false">
      <h2>All 18 Chapters of the Bhagavad Gita — Complete 700 Verse Archive</h2>
      <p>The Bhagavad Gita contains 700 verses (shlokas) across 18 chapters. Each chapter covers a unique aspect of Hindu philosophy, from Arjuna's despair to the path of liberation.</p>`;

  CHAPTERS.forEach(ch => {
    chapterListHtml += `
      <article>
        <h3><a href="/?ch=${ch.chapter}&v=1">Chapter ${ch.chapter} — ${ch.en} (${ch.te})</a></h3>
        <p>${ch.verses} verses. <a href="/?ch=${ch.chapter}&v=1">Read Chapter ${ch.chapter} →</a></p>
      </article>`;
  });

  chapterListHtml += `
    </section>
    <!-- END PRE-RENDERED ARCHIVE -->`;

  archiveHtml = archiveHtml.replace('</main>', chapterListHtml + '\n  </main>');
  fs.writeFileSync(archivePath, archiveHtml, 'utf-8');
  console.log(`  ✅ archive.html — injected 18 chapter listings`);

  // ─────────────────────────────────────────────
  // 4. Update sitemap with lastmod
  // ─────────────────────────────────────────────
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];
    // Add lastmod after each <priority> tag
    sitemap = sitemap.replace(/<\/priority>/g, `</priority>\n    <lastmod>${today}</lastmod>`);
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log(`  ✅ sitemap.xml — added lastmod ${today}`);
  }

  db.close();
  console.log('🎉 Pre-rendering complete!');
}

run();
