const Database = require('better-sqlite3');
const db = new Database('data/geetha.db', { readonly: true });

const rows = db.prepare("SELECT id, telugu_translation, english_translation FROM shlokas WHERE id IN ('BG1.1', 'BG1.2')").all();
for (const s of rows) {
  console.log(s.id);
  console.log('  Telugu:', s.telugu_translation ? s.telugu_translation.substring(0, 100) : 'NULL');
  console.log('  English:', s.english_translation ? s.english_translation.substring(0, 100) : 'NULL');
}

const nullCount = db.prepare("SELECT COUNT(*) as c FROM shlokas WHERE telugu_translation IS NULL OR telugu_translation = ''").get();
console.log('\nShlokas with no Telugu translation:', nullCount.c, '/ 700');

db.close();
