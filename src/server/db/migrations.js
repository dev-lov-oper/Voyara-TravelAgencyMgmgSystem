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
 * Seeds default demo users with simple password 'voyara123' if not present.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function seedDefaultUsersIfEmpty(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL DEFAULT 'voyara123',
        full_name TEXT,
        role TEXT DEFAULT 'customer',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Ensure role column exists if table was created by earlier migration
    try {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';");
    } catch {
      // Column already exists
    }

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (email, password, full_name, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('agent@voyara.com', 'agent123', 'Voyara Travel Agent', 'agent');
    insertUser.run('ksharvan2007@gmail.com', 'voyara123', 'Sharvan kotharu', 'customer');
    insertUser.run('livetest@voyara.com', 'voyara123', 'Live Test User', 'customer');

    // Auto-sync any existing customer bookings into users with default password
    try {
      const existingBookings = db.prepare('SELECT DISTINCT email, full_name FROM bookings WHERE email IS NOT NULL').all();
      for (const b of existingBookings) {
        if (b.email) {
          insertUser.run(b.email.trim().toLowerCase(), 'voyara123', b.full_name || 'Traveler', 'customer');
        }
      }
    } catch {
      // Ignore if bookings table not ready yet
    }
  } catch {
    // Ignore error
  }
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

  // Ensure demo users with simple password are seeded
  seedDefaultUsersIfEmpty(db);

  return newlyApplied;
}
