/**
 * Batch translate English translations to Telugu using Gemini
 * Run: node scripts/translate-telugu.js
 * 
 * Translates in small batches with rate limiting to avoid API limits.
 * Safe to re-run — skips shlokas that already have Telugu translations.
 */

require('dotenv').config();
const { getDb } = require('./db');
const { translateToTelugu } = require('./gemini');

const BATCH_SIZE = 5;       // shlokas per batch
const DELAY_MS = 2000;      // delay between individual translations
const BATCH_DELAY_MS = 5000; // delay between batches

async function translateAll() {
  const db = getDb();

  // Find shlokas missing Telugu translation
  const missing = db.prepare(`
    SELECT id, chapter, verse, english_translation, slok 
    FROM shlokas 
    WHERE (telugu_translation IS NULL OR telugu_translation = '')
      AND english_translation IS NOT NULL AND english_translation != ''
    ORDER BY day_number
  `).all();

  console.log(`📝 Found ${missing.length} shlokas needing Telugu translation`);
  
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

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i/BATCH_SIZE) + 1} (shlokas ${i+1}-${Math.min(i+BATCH_SIZE, missing.length)} of ${missing.length}) ---`);

    for (const shloka of batch) {
      try {
        const context = `Chapter ${shloka.chapter}, Verse ${shloka.verse}`;
        console.log(`  Translating ${shloka.id}...`);
        
        const teluguText = await translateToTelugu(
          shloka.english_translation, 
          context
        );

        if (teluguText && teluguText.length > 10) {
          updateStmt.run(teluguText, shloka.id);
          translated++;
          console.log(`  ✅ ${shloka.id} → ${teluguText.substring(0, 60)}...`);
        } else {
          console.log(`  ⚠️ ${shloka.id}: Translation too short, skipping`);
          errors++;
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
      } catch (err) {
        console.error(`  ❌ ${shloka.id}: ${err.message}`);
        errors++;
        // Back off on error
        await new Promise(r => setTimeout(r, DELAY_MS * 3));
      }
    }

    if (i + BATCH_SIZE < missing.length) {
      console.log(`  ⏳ Waiting before next batch...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\n🎉 Done! Translated: ${translated}, Errors: ${errors}`);
  console.log(`   Total with Telugu: ${db.prepare("SELECT COUNT(*) as c FROM shlokas WHERE telugu_translation IS NOT NULL AND telugu_translation != ''").get().c} / 700`);
  db.close();
}

translateAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
