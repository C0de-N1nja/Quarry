const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { STAGE_MAP_OLD_TO_NEW, STAGES } = require('../../shared/stages');

function runMigration(dbPath = null) {
  const targetDbPath = dbPath || process.env.DB_PATH || path.join(__dirname, '../db/hunting.db');
  
  if (!fs.existsSync(targetDbPath)) {
    console.log(`[Stage Migration] Database file not found at ${targetDbPath}, skipping.`);
    return { success: false, reason: 'file_not_found' };
  }

  // Backup hunting.db first
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${targetDbPath}.bak-${timestamp}`;
  fs.copyFileSync(targetDbPath, backupPath);
  console.log(`[Stage Migration] Backup created at: ${backupPath}`);

  const db = new Database(targetDbPath);

  // Get initial distribution
  const beforeRows = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  console.log('\n[Stage Migration] Current status distribution BEFORE migration:');
  console.table(beforeRows);

  const migrationMap = [
    { target: STAGES.NEW, from: ['discovered', 'Discovered', 'new', 'New'] },
    { target: STAGES.CONTACT_FOUND, from: ['enriched', 'Enriched', 'contacts_found', 'Contacts Found', 'contact_found'] },
    { target: STAGES.MESSAGED, from: ['pitched', 'Pitched', 'outreached', 'Outreached', 'contacted', 'Contacted', 'sent', 'Sent', 'messaged'] },
    { target: STAGES.REPLIED, from: ['in_discussion', 'In Discussion', 'replied', 'Replied'] },
    { target: STAGES.WON, from: ['won', 'Won'] },
    { target: STAGES.LOST, from: ['archived', 'Archived', 'lost', 'Lost'] }
  ];

  const logStats = [];

  const updateStmt = db.prepare('UPDATE leads SET status = ? WHERE status = ?');
  const migrateTransaction = db.transaction(() => {
    for (const rule of migrationMap) {
      let movedCount = 0;
      for (const oldStatus of rule.from) {
        if (oldStatus !== rule.target) {
          const res = updateStmt.run(rule.target, oldStatus);
          movedCount += res.changes;
        }
      }
      logStats.push({ targetStage: rule.target, rowsMigrated: movedCount });
    }
  });

  migrateTransaction();

  // Get final distribution
  const afterRows = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  console.log('\n[Stage Migration] Status distribution AFTER migration:');
  console.table(afterRows);

  console.log('\n[Stage Migration] Rows migrated per target stage:');
  console.table(logStats);

  db.close();

  return {
    success: true,
    backupPath,
    before: beforeRows,
    after: afterRows,
    migrated: logStats
  };
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
