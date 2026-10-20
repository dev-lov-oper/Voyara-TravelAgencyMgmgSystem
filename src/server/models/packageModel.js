/**
 * Package Model / Data Access Layer for Voyara TAMS
 */

function deserializePackage(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    duration: Number(row.duration) || 1,
    durationText: row.duration_text || `${row.duration} days`,
    price: Number(row.price) || 0,
    formattedPrice: row.formatted_price || `₹${Number(row.price).toLocaleString('en-IN')}`,
    description: row.description || '',
    imageUrl: row.image_url || '',
    imageAlt: row.image_alt || '',
    category: row.category || 'Curated Escape',
    isActive: Boolean(row.is_active),
    itinerary: row.itinerary ? JSON.parse(row.itinerary) : [],
    inclusions: row.inclusions ? JSON.parse(row.inclusions) : [],
    exclusions: row.exclusions ? JSON.parse(row.exclusions) : [],
    createdAt: row.created_at,
  };
}

/**
 * Retrieves all packages from the database.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true]
 * @returns {Array<Object>}
 */
export function getAllPackages(db, { activeOnly = true } = {}) {
  const query = activeOnly
    ? 'SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC'
    : 'SELECT * FROM packages ORDER BY price ASC';
  const rows = db.prepare(query).all();
  return rows.map(deserializePackage);
}

/**
 * Retrieves a single package by its identifier.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} id
 * @returns {Object|null}
 */
export function getPackageById(db, id) {
  if (!id) return null;
  const row = db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
  return deserializePackage(row);
}
