# 🕉️ గీత | Geetha — Daily Bhagavad Gita Wisdom

<div align="center">

**A bilingual (English & Telugu) Bhagavad Gita platform — one shloka per day, with AI-powered spiritual insights.**

🌐 **Live**: [geetha.kprsnt.in](https://geetha.kprsnt.in)

![Daily Shloka](https://img.shields.io/badge/Verses-700-gold?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20తెలుగు-blue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Gemini-purple?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📖 **Daily Shloka** | One verse per day across all 700 shlokas, cycling through the entire Bhagavad Gita |
| 🇮🇳 **Bilingual** | Full English & Telugu translations for every verse |
| 🕉️ **Sanskrit** | Original Sanskrit text with Roman transliteration |
| 🤖 **AI Blog** | Gemini-generated spiritual blog posts connecting ancient wisdom to modern life |
| ✍️ **Life Notes** | Write personal reflections → AI strips personal info → publishes universal spiritual lessons |
| 📦 **Smart Segments** | AI groups related verses into complete thoughts (e.g., a full dialogue) — one blog per segment |
| 📊 **Progress Tracking** | Track your journey through all 700 verses |
| 🌙 **Beautiful UI** | Cosmic dark theme with glassmorphism, gold accents, and micro-animations |

## 🏗️ Architecture

```
geetha/
├── src/                    # Frontend (Vite)
│   ├── index.html          # Daily shloka page
│   ├── blog.html           # Spiritual blog
│   ├── archive.html        # All 700 verses
│   ├── js/                 # Frontend logic
│   └── css/                # Styles (cosmic dark theme)
├── api/                    # Vercel Serverless Functions
│   ├── daily.js            # GET /api/daily — today's shloka + blog
│   ├── shloka.js           # GET /api/shloka?ch=1&v=1
│   └── blogs.js            # GET /api/blogs
├── scripts/                # Build & data scripts
│   ├── fetch-all-shlokas.js    # Fetch 700 verses from Vedic Scriptures API
│   ├── translate-telugu.js     # Batch translate to Telugu via Gemini
│   ├── generate-segments.js    # AI-generated verse segment groupings
│   ├── daily-generate.js       # Daily blog generation (GitHub Actions)
│   ├── gemini.js               # Gemini AI service
│   ├── slim-db.js              # Create optimized DB for production
│   └── db.js                   # SQLite database init
├── data/
│   ├── geetha.db           # Full SQLite database (700 shlokas + blogs)
│   ├── geetha-slim.db      # Production-optimized (no raw_json)
│   └── segments.json       # AI-generated verse segment map
├── blog_drafts/            # Drop .md/.txt personal reflections here
│   └── published/          # Processed drafts moved here
└── .github/workflows/
    └── daily-blog.yml      # Cron (midnight IST) + push trigger
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm
- [Gemini API Key](https://aistudio.google.com/apikey)

### Setup

```bash
# Clone
git clone https://github.com/kprsnt2/Geetha.git
cd Geetha

# Install
npm install

# Environment
echo "GEMINI_API_KEY=your_key_here" > .env

# Fetch all 700 shlokas (one-time)
npm run fetch-shlokas

# Add Telugu translations (one-time, ~3 API calls)
node scripts/translate-telugu.js

# Generate verse segment map (one-time, ~18 API calls)
node scripts/generate-segments.js

# Start development
npm run dev
```

### Data Pipeline

```
Vedic Scriptures API → fetch-all-shlokas.js → geetha.db (700 verses)
                          ↓
              translate-telugu.js → Telugu translations (Gemini)
                          ↓
            generate-segments.js → segments.json (verse groupings)
                          ↓
              daily-generate.js → AI blog posts (Gemini)
                          ↓
                    slim-db.js → geetha-slim.db (production)
```

## 📝 Writing Life Notes

Drop your personal reflections in `blog_drafts/` as `.md` or `.txt` files:

```markdown
<!-- blog_drafts/my-reflection.md -->
Today at work, my colleague Ravi and I argued about a deadline.
I realized that my ego was speaking, not my wisdom...
```

On push to `main`, GitHub Actions will:
1. Strip all personal info (names, places, dates)
2. Convert to a universal spiritual lesson
3. Connect to the Bhagavad Gita
4. Translate to Telugu
5. Publish as a blog post

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm run fetch-shlokas` | Fetch all 700 verses |
| `npm run slim-db` | Create optimized production DB |
| `node scripts/translate-telugu.js` | Batch translate to Telugu |
| `node scripts/generate-segments.js` | Generate verse segment map |
| `node scripts/daily-generate.js` | Generate daily blog post |

## 🌍 SEO & Discovery

- **Structured Data**: JSON-LD schemas (WebSite, Book, Blog, FAQ, BreadcrumbList)
- **Open Graph & Twitter Cards**: Rich social sharing previews
- **Sitemap & Robots.txt**: Auto-discoverable by all search engines
- **AI Crawler Friendly**: Allows GPTBot, Google-Extended, PerplexityBot, CCBot
- **Bilingual Content**: Telugu + English for regional search visibility
- **Semantic HTML**: Proper heading hierarchy, ARIA labels, schema markup

## 📡 API

| Endpoint | Description |
|----------|-------------|
| `GET /api/daily` | Today's shloka, blog, and segment info |
| `GET /api/shloka?ch=1&v=1` | Specific verse by chapter & verse |
| `GET /api/blogs` | All blog posts |

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: SQLite (via `sql.js` for serverless, `better-sqlite3` for local)
- **AI**: Google Gemini (blog generation, translation, segmentation)
- **Data Source**: [Vedic Scriptures API](https://vedicscriptures.github.io/)
- **CI/CD**: GitHub Actions + Vercel

## 📜 License

This project is for spiritual learning and personal growth. Data sourced from [Vedic Scriptures API](https://vedicscriptures.github.io/).

---

<div align="center">

🙏 *A journey through 700 verses of the Bhagavad Gita* 🙏

**[geetha.kprsnt.in](https://geetha.kprsnt.in)**

</div>
