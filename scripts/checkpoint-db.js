/**
 * Checkpoint WAL — merge WAL journal back into the main .db file
 * Run this before committing to git / deploying to Vercel
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'geetha.db');

const db = new Database(DB_PATH);

// Force a WAL checkpoint to merge WAL into the main database file
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('✅ WAL checkpoint complete — database consolidated');

// Show database stats
const shlokas = db.prepare('SELECT COUNT(*) as count FROM shlokas').get();
const blogs = db.prepare('SELECT COUNT(*) as count FROM blogs').get();
console.log(`   Shlokas: ${shlokas.count}`);
console.log(`   Blogs: ${blogs.count}`);

db.close();

// Verify WAL files are cleaned up
const walPath = DB_PATH + '-wal';
const shmPath = DB_PATH + '-shm';
if (fs.existsSync(walPath)) {
  const walSize = fs.statSync(walPath).size;
  console.log(`   WAL file size: ${walSize} bytes (should be 0 or very small)`);
} else {
  console.log('   WAL file cleaned up');
}
