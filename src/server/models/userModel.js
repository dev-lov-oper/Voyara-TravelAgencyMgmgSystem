/**
 * User / Customer Model for Voyara TAMS
 * Handles simple password storage and user account retrieval.
 */

/**
 * Retrieves a user account by email address (case-insensitive).
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} email
 * @returns {Object|null}
 */
export function getUserByEmail(db, email) {
  if (!email || typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const row = db.prepare('SELECT id, email, password, full_name, role, created_at FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (!row) return null;
    return {
      ...row,
      role: row.role || 'customer',
    };
  } catch {
    try {
      const fallback = db.prepare('SELECT id, email, password, full_name, created_at FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
      if (!fallback) return null;
      return {
        ...fallback,
        role: 'customer',
      };
    } catch {
      return null;
    }
  }
}

/**
 * Creates or updates a user account with a simple password and role.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} [userData.password='voyara123']
 * @param {string} [userData.fullName='']
 * @param {string} [userData.role='customer']
 * @returns {Object}
 */
export function createUser(db, { email, password = 'voyara123', fullName = '', role = 'customer' }) {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email is required to create a user account.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = (password || 'voyara123').trim();
  const cleanName = (fullName || '').trim();
  const cleanRole = (role || 'customer').trim();

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL DEFAULT 'voyara123',
      full_name TEXT,
      role TEXT DEFAULT 'customer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.prepare(`
      INSERT INTO users (email, password, full_name, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = CASE WHEN excluded.full_name != '' THEN excluded.full_name ELSE users.full_name END,
        password = CASE WHEN excluded.password != '' THEN excluded.password ELSE users.password END,
        role = CASE WHEN excluded.role != '' THEN excluded.role ELSE users.role END
    `).run(normalizedEmail, cleanPassword, cleanName, cleanRole);
  } catch {
    db.prepare(`
      INSERT INTO users (email, password, full_name)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = CASE WHEN excluded.full_name != '' THEN excluded.full_name ELSE users.full_name END,
        password = CASE WHEN excluded.password != '' THEN excluded.password ELSE users.password END
    `).run(normalizedEmail, cleanPassword, cleanName);
  }

  return getUserByEmail(db, normalizedEmail);
}
