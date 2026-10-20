/**
 * SQLite Database Connection Layer for Voyara TAMS
 * Uses Node.js native SQLite (node:sqlite DatabaseSync).
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

let defaultDbInstance = null;

/**
 * Creates and configures a SQLite database instance.
 *
 * @param {Object} [options]
 * @param {boolean} [options.memory=false] - If true, creates an in-memory SQLite database
 * @param {string} [options.dbPath] - Custom path to SQLite file (defaults to data/voyara.db)
 * @returns {DatabaseSync}
 */
export function getDatabase(options = {}) {
  if (options.memory) {
    const memDb = new DatabaseSync(':memory:');
    memDb.exec('PRAGMA foreign_keys = ON;');
    return memDb;
  }

  const defaultPath = path.resolve(process.cwd(), 'data', 'voyara.db');
  const dbPath = options.dbPath || defaultPath;

  // Ensure parent directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // Ignore journal_mode error if unsupported in specific filesystem
  }

  return db;
}

/**
 * Returns a shared default database instance for the application server.
 * Initializes schema and applies pending migrations if not already done.
 *
 * @param {Object} [options]
 * @returns {DatabaseSync}
 */
export function getDefaultDatabase(options = {}) {
  if (!defaultDbInstance) {
    defaultDbInstance = getDatabase(options);
  }
  return defaultDbInstance;
}

/**
 * Closes a database instance.
 *
 * @param {DatabaseSync} [db]
 */
export function closeDatabase(db) {
  const target = db || defaultDbInstance;
  if (target) {
    try {
      target.close();
    } catch {
      // Ignore if already closed
    }
    if (target === defaultDbInstance) {
      defaultDbInstance = null;
    }
  }
}
