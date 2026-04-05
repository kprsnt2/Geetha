/**
 * Fetch all 700 Bhagavad Gita shlokas from the Vedic Scriptures API
 * and store them in the SQLite database.
 * 
 * API: https://vedicscriptures.github.io/slok/{chapter}/{verse}
 */

const { initializeDatabase } = require('./db');
const { buildFullMapping } = require('./shlokaMapper');

const DELAY_MS = 300; // be kind to the API

async function fetchShloka(chapter, verse) {
  const url = `https://vedicscriptures.github.io/slok/${chapter}/${verse}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

function extractTranslations(data) {
  // English translation - prefer Swami Sivananda, then Prabhupada, then Purohit
  let english_translation = '';
  let english_commentary = '';

  if (data.siva) {
    english_translation = data.siva.et || '';
    english_commentary = data.siva.ec || '';
  } else if (data.prabhu) {
    english_translation = data.prabhu.et || '';
    english_commentary = data.prabhu.ec || '';
  } else if (data.purohit) {
    english_translation = data.purohit.et || '';
  } else if (data.gambir) {
    english_translation = data.gambir.et || '';
  }

  // Hindi translation - prefer Swami Tejomayananda
  let hindi_translation = '';
  if (data.tej) {
    hindi_translation = data.tej.ht || '';
  } else if (data.rams) {
    hindi_translation = data.rams.ht || '';
  }

  return { english_translation, english_commentary, hindi_translation };
}

async function fetchAllShlokas() {
  const db = initializeDatabase();
  const mapping = buildFullMapping();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO shlokas (id, chapter, verse, day_number, slok, transliteration, 
      english_translation, english_commentary, hindi_translation, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Check how many we already have
  const existing = db.prepare('SELECT COUNT(*) as count FROM shlokas').get();
  console.log(`📚 Found ${existing.count} existing shlokas in database`);

  let fetched = 0;
  let skipped = 0;
  let errors = 0;

  for (const { day, chapter, verse } of mapping) {
    const id = `BG${chapter}.${verse}`;

    // Skip if already fetched
    const exists = db.prepare('SELECT id FROM shlokas WHERE id = ?').get(id);
    if (exists) {
      skipped++;
      continue;
    }

    try {
      console.log(`  Fetching Day ${day}: Chapter ${chapter}, Verse ${verse} (${id})...`);
      const data = await fetchShloka(chapter, verse);
      const { english_translation, english_commentary, hindi_translation } = extractTranslations(data);

      insertStmt.run(
        id,
        chapter,
        verse,
        day,
        data.slok || '',
        data.transliteration || '',
        english_translation,
        english_commentary,
        hindi_translation,
        JSON.stringify(data)
      );

      fetched++;
      if (fetched % 50 === 0) {
        console.log(`  ✅ Fetched ${fetched} shlokas so far...`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, DELAY_MS));
    } catch (err) {
      console.error(`  ❌ Error fetching ${id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n🎉 Done! Fetched: ${fetched}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log(`   Total in database: ${db.prepare('SELECT COUNT(*) as count FROM shlokas').get().count}`);
  db.close();
}

fetchAllShlokas().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
