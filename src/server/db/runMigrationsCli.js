/**
 * CLI script to run database migrations
 * Usage: node src/server/db/runMigrationsCli.js
 */
import { getDefaultDatabase, closeDatabase } from './database.js';
import { runMigrations, getAppliedMigrations } from './migrations.js';

console.log('[Voyara TAMS Migration] Initializing SQLite database connection...');
const db = getDefaultDatabase();

try {
  const previouslyApplied = getAppliedMigrations(db);
  console.log(`[Voyara TAMS Migration] Previously applied migrations: ${Array.from(previouslyApplied).join(', ') || 'None'}`);

  const newlyApplied = runMigrations(db);
  if (newlyApplied.length > 0) {
    console.log(`[Voyara TAMS Migration] Successfully applied ${newlyApplied.length} new migration(s): ${newlyApplied.join(', ')}`);
  } else {
    console.log('[Voyara TAMS Migration] Database schema is up to date.');
  }

  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get().count;
  const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  console.log(`[Voyara TAMS Migration] Catalog packages: ${packageCount}, Stored bookings: ${bookingCount}`);
} catch (error) {
  console.error('[Voyara TAMS Migration] Error executing migrations:', error);
  process.exit(1);
} finally {
  closeDatabase(db);
}
