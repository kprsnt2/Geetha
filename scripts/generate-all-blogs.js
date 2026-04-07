/**
 * Batch generate AI blogs for ALL verse segments.
 * Run this locally once to populate the database with all blogs.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { generateShlokaBlog } = require('./gemini');

const SEGMENTS_FILE = path.join(__dirname, '..', 'data', 'segments.json');

// Helper to delay execution (to respect rate limits)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateAllBlogs() {
  const db = getDb();
  
  if (!fs.existsSync(SEGMENTS_FILE)) {
    console.error('Segments file not found. Run generate-segments.js first.');
    process.exit(1);
  }

  const segments = JSON.parse(fs.readFileSync(SEGMENTS_FILE, 'utf-8'));
  console.log(`\n📚 Loaded ${segments.length} segments. Starting batched blog generation...`);

  let generatedCount = 0;
  let skippedCount = 0;

  for (const segment of segments) {
    // Determine the primary shloka for this segment (usually start_id)
    const primaryShlokaId = segment.start_id;
    
    const existingBlog = db.prepare("SELECT id FROM blogs WHERE shloka_id = ? AND type = 'ai'").get(primaryShlokaId);

    if (existingBlog) {
      console.log(`Skipping Segment ${primaryShlokaId} to ${segment.end_id} - Blog already exists.`);
      skippedCount++;
      continue;
    }

    console.log(`\n✨ Generating blog for Segment: ${primaryShlokaId} to ${segment.end_id}`);
    console.log(`Topic: ${segment.topic_en}`);

    // Fetch the primary shloka details (for translation and base content)
    const shloka = db.prepare('SELECT * FROM shlokas WHERE id = ?').get(primaryShlokaId);
    
    if (!shloka) {
      console.warn(`⚠️ Shloka ${primaryShlokaId} not found in DB!`);
      continue;
    }

    try {
      // Pass the segment context to the generator
      shloka.segmentInfo = {
        start: segment.start_id,
        end: segment.end_id,
        count: segment.verse_count,
        topic: segment.topic_en
      };

      const blogData = await generateShlokaBlog(shloka);

      // Save the generated blog
      db.prepare(`
        INSERT INTO blogs (shloka_id, type, title_en, title_te, content_en, content_te, excerpt_en, excerpt_te, tags)
        VALUES (?, 'ai', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        primaryShlokaId,
        blogData.title_en,
        blogData.title_te || '',
        blogData.content_en,
        blogData.content_te || '',
        blogData.excerpt_en || '',
        blogData.excerpt_te || '',
        JSON.stringify(blogData.tags || [])
      );

      console.log(`  ✅ Saved: "${blogData.title_en}"`);
      generatedCount++;

      // Pause to avoid hitting rate limits too quickly 
      // Using 5 seconds between calls
      console.log(`  Waiting 5 seconds before next request...`);
      await delay(5000);

    } catch (err) {
      console.error(`  ❌ Failed to generate blog for ${primaryShlokaId}: ${err.message}`);
      console.error(err.stack);
      console.log('Stopping batched generation to avoid cascading errors. You can restart to resume.');
      break;
    }
  }

  db.close();
  console.log(`\n🎉 Generation complete!`);
  console.log(`Generated: ${generatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

generateAllBlogs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
