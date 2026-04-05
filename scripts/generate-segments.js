/**
 * Generate a segment map for all 700 Bhagavad Gita verses.
 * Groups consecutive verses that form a complete thought/dialogue.
 * 
 * Uses Gemini to analyze verse translations and identify natural breakpoints.
 * Output: data/segments.json
 * 
 * Run once: node scripts/generate-segments.js
 */

require('dotenv').config();
const { getDb } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

async function generateSegments() {
  const db = getDb();
  const OUTPUT = path.join(__dirname, '..', 'data', 'segments.json');

  const allSegments = [];

  // Process chapter by chapter
  for (let ch = 1; ch <= 18; ch++) {
    const verses = db.prepare(
      'SELECT id, chapter, verse, english_translation, slok FROM shlokas WHERE chapter = ? ORDER BY verse'
    ).all(ch);

    console.log(`\n📖 Chapter ${ch} (${verses.length} verses)...`);

    const verseList = verses.map(v =>
      `${v.id}: ${v.english_translation}`
    ).join('\n\n');

    const prompt = `You are a Bhagavad Gita scholar. Analyze the following verses from Chapter ${ch} and group them into logical segments. Each segment should be a COMPLETE thought, dialogue, or teaching that makes sense as a standalone blog topic.

Rules:
- A segment can be 1 verse (if self-contained) or up to 15 verses (if a continuing dialogue)
- Duryodhana listing warriors = one segment, not individual verses
- A question + answer = one segment
- Krishna's complete teaching on a topic = one segment
- Every verse MUST belong to exactly one segment
- Segments must be consecutive (no gaps, no overlaps)

Verses:
${verseList}

Return ONLY valid JSON — an array of segments:
[
  {
    "start_verse": 1,
    "end_verse": 11,
    "topic_en": "Duryodhana surveys the armies and reports to Drona",
    "topic_te": "దుర్యోధనుడు సైన్యాలను పరిశీలించి ద్రోణాచార్యునికి నివేదించడం"
  },
  ...
]`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error(`  ❌ Failed to parse segments for chapter ${ch}`);
        continue;
      }

      const chapterSegments = JSON.parse(jsonMatch[0]);

      // Convert to global format with shloka IDs
      for (const seg of chapterSegments) {
        allSegments.push({
          start_id: `BG${ch}.${seg.start_verse}`,
          end_id: `BG${ch}.${seg.end_verse}`,
          chapter: ch,
          start_verse: seg.start_verse,
          end_verse: seg.end_verse,
          verse_count: seg.end_verse - seg.start_verse + 1,
          topic_en: seg.topic_en,
          topic_te: seg.topic_te
        });
      }

      console.log(`  ✅ ${chapterSegments.length} segments (${chapterSegments.map(s => `${s.start_verse}-${s.end_verse}`).join(', ')})`);

      // Rate limit
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`  ❌ Chapter ${ch} failed: ${err.message}`);
    }
  }

  // Validate: ensure all 700 verses are covered
  let totalVerses = 0;
  for (const seg of allSegments) {
    totalVerses += seg.verse_count;
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(allSegments, null, 2));
  console.log(`\n🎉 Generated ${allSegments.length} segments covering ${totalVerses} verses`);
  console.log(`   Saved to ${OUTPUT}`);

  if (totalVerses !== 700) {
    console.warn(`   ⚠️ Expected 700 verses but got ${totalVerses} — some gaps or overlaps!`);
  }

  db.close();
}

generateSegments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
