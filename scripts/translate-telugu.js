/**
 * Batch translate English translations to Telugu using Gemini
 * 
 * Usage:
 *   node scripts/translate-telugu.js              # translate up to 250 shlokas (default)
 *   node scripts/translate-telugu.js --limit 300  # translate up to 300 shlokas
 *   node scripts/translate-telugu.js --all         # translate all remaining
 * 
 * Sends 10 shlokas per Gemini API call to minimize requests.
 * Safe to re-run — skips shlokas that already have Telugu translations.
 * Run 2-3 times to cover all 700 verses.
 */

require('dotenv').config();
const { getDb } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// --- Config ---
const SHLOKAS_PER_API_CALL = 235; // ~235 shlokas per Gemini call (3 calls for all 700)
const DELAY_BETWEEN_CALLS = 5000; // 5s between API calls
const DEFAULT_LIMIT = 700;        // do all by default in 3 API calls

// Parse CLI args
const args = process.argv.slice(2);
let LIMIT = DEFAULT_LIMIT;
if (args.includes('--all')) {
  LIMIT = Infinity;
} else {
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    LIMIT = parseInt(args[limitIdx + 1]);
  }
}

/**
 * Translate a batch of shlokas in a single Gemini API call
 */
async function translateBatch(shlokas) {
  const entries = shlokas.map((s, i) =>
    `[${i + 1}] ${s.id} (Chapter ${s.chapter}, Verse ${s.verse}):\n${s.english_translation}`
  ).join('\n\n');

  const prompt = `Translate each of the following Bhagavad Gita verse translations from English to natural, readable Telugu (using Telugu script). Maintain the spiritual tone.

${entries}

Return ONLY a valid JSON object mapping each ID to its Telugu translation. Example format:
{"BG1.1": "తెలుగు అనువాదం...", "BG1.2": "తెలుగు అనువాదం..."}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function translateAll() {
  const db = getDb();

  // Find shlokas missing Telugu translation
  const allMissing = db.prepare(`
    SELECT id, chapter, verse, english_translation, slok 
    FROM shlokas 
    WHERE (telugu_translation IS NULL OR telugu_translation = '')
      AND english_translation IS NOT NULL AND english_translation != ''
    ORDER BY day_number
  `).all();

  const missing = allMissing.slice(0, LIMIT);
  const remaining = allMissing.length - missing.length;

  console.log(`📝 ${allMissing.length} shlokas need Telugu translation`);
  console.log(`   This run: ${missing.length} shlokas (${Math.ceil(missing.length / SHLOKAS_PER_API_CALL)} API calls)`);
  if (remaining > 0) {
    console.log(`   Remaining for next run: ${remaining}`);
  }
  console.log();

  if (missing.length === 0) {
    console.log('✅ All shlokas already have Telugu translations!');
    db.close();
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE shlokas SET telugu_translation = ? WHERE id = ?
  `);

  let translated = 0;
  let errors = 0;
  const totalCalls = Math.ceil(missing.length / SHLOKAS_PER_API_CALL);

  for (let i = 0; i < missing.length; i += SHLOKAS_PER_API_CALL) {
    const batch = missing.slice(i, i + SHLOKAS_PER_API_CALL);
    const callNum = Math.floor(i / SHLOKAS_PER_API_CALL) + 1;
    const ids = batch.map(s => s.id).join(', ');

    console.log(`[${callNum}/${totalCalls}] Translating ${ids}...`);

    try {
      const translations = await translateBatch(batch);

      // Save each translation
      for (const shloka of batch) {
        const teluguText = translations[shloka.id];
        if (teluguText && teluguText.length > 10) {
          updateStmt.run(teluguText, shloka.id);
          translated++;
        } else {
          console.log(`  ⚠️ ${shloka.id}: missing or too short`);
          errors++;
        }
      }
      console.log(`  ✅ ${Object.keys(translations).length} translations saved`);
    } catch (err) {
      console.error(`  ❌ Batch failed: ${err.message}`);
      errors += batch.length;
      // Longer backoff on error
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS * 3));
    }

    // Rate limit pause
    if (i + SHLOKAS_PER_API_CALL < missing.length) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS));
    }
  }

  const totalDone = db.prepare("SELECT COUNT(*) as c FROM shlokas WHERE telugu_translation IS NOT NULL AND telugu_translation != ''").get().c;
  console.log(`\n🎉 Done! Translated: ${translated}, Errors: ${errors}`);
  console.log(`   Total with Telugu: ${totalDone} / 700`);
  if (totalDone < 700) {
    console.log(`\n💡 Run again to translate the remaining ${700 - totalDone} shlokas`);
  }
  db.close();
}

translateAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
