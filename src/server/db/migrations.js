/**
 * Database Migration Runner for Voyara TAMS
 * Automatically runs pending SQL migrations and tracks them in the database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_PACKAGES } from '../../data/packages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates the migrations tracking table if not present.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Retrieves the names of already applied migrations.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {Set<string>}
 */
export function getAppliedMigrations(db) {
  ensureMigrationsTable(db);
  const rows = db.prepare('SELECT name FROM migrations ORDER BY id ASC').all();
  return new Set(rows.map((r) => r.name));
}

/**
 * Seeds packages table with initial sample data if currently empty.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Array} [packagesList]
 */
export function seedPackagesIfEmpty(db, packagesList = SAMPLE_PACKAGES) {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM packages').get();
  if (countRow && countRow.count > 0) {
    return 0; // Already seeded
  }

  const insertStmt = db.prepare(`
    INSERT INTO packages (
      id, title, destination, duration, duration_text, price, formatted_price,
      description, image_url, image_alt, category, is_active,
      itinerary, inclusions, exclusions
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  let count = 0;
  for (const pkg of packagesList) {
    insertStmt.run(
      pkg.id,
      pkg.title,
      pkg.destination,
      pkg.duration || 1,
      pkg.durationText || `${pkg.duration || 1} days`,
      pkg.price || 0,
      pkg.formattedPrice || `₹${Number(pkg.price || 0).toLocaleString('en-IN')}`,
      pkg.description || '',
      pkg.imageUrl || '',
      pkg.imageAlt || '',
      pkg.category || 'Curated Escape',
      pkg.isActive !== false ? 1 : 0,
      JSON.stringify(pkg.itinerary || []),
      JSON.stringify(pkg.inclusions || []),
      JSON.stringify(pkg.exclusions || [])
    );
    count++;
  }

  return count;
}

/**
 * Applies all pending migrations in order.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} [options]
 * @param {string} [options.migrationsDir] - Custom directory for migration files
 * @returns {Array<string>} List of newly applied migration names
 */
export function runMigrations(db, options = {}) {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);
  const migrationsDir = options.migrationsDir || path.resolve(__dirname, 'migrations');

  const newlyApplied = [];

  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!applied.has(file)) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Execute migration within database
        db.exec(sql);

        // Record applied migration
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        newlyApplied.push(file);
      }
    }
  }

  // Ensure initial active packages are available in database
  seedPackagesIfEmpty(db);

  return newlyApplied;
}
