/**
 * Booking Model / Data Access Layer for Voyara TAMS
 * Handles booking creation, reference generation, and database retrieval.
 */

/**
 * Generates a clean, unique, human-readable booking reference.
 * Format: BK-YYYYMMDD-XXXX (e.g. BK-20261020-7A3B)
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function generateBookingReference(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  // 4-character random alphanumeric suffix in uppercase
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${dateSegment}-${randomSuffix}`;
}

/**
 * Maps raw database row to application booking object.
 *
 * @param {Object} row
 * @returns {Object|null}
 */
export function mapBookingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    packageId: row.package_id,
    packageTitle: row.package_title || row.title || null,
    packageDestination: row.package_destination || row.destination || null,
    packagePrice: row.package_price !== undefined ? Number(row.package_price) : (row.price ? Number(row.price) : null),
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    travelerCount: Number(row.traveler_count),
    travelDate: row.travel_date,
    additionalRequests: row.additional_requests || '',
    status: row.status || 'Pending',
    totalPrice: Number(row.total_price),
    formattedTotal: `₹${Number(row.total_price).toLocaleString('en-IN')}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates and persists a new booking in the database.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} data
 * @param {string} data.packageId
 * @param {string} data.fullName
 * @param {string} data.email
 * @param {string} data.phone
 * @param {number} data.travelerCount
 * @param {string} data.travelDate
 * @param {string} [data.additionalRequests]
 * @param {string} [data.bookingReference] - Optional override, defaults to generated
 * @param {string} [data.status='Pending']
 * @param {number} data.totalPrice
 * @returns {Object} Newly created booking object
 */
export function createBooking(db, data) {
  const reference = data.bookingReference || generateBookingReference();
  const status = data.status || 'Pending';
  const additionalRequests = (data.additionalRequests || '').trim();
  const nowIso = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO bookings (
      booking_reference,
      package_id,
      full_name,
      email,
      phone,
      traveler_count,
      travel_date,
      additional_requests,
      status,
      total_price,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertStmt.run(
    reference,
    data.packageId,
    data.fullName.trim(),
    data.email.trim(),
    data.phone.trim(),
    Number(data.travelerCount),
    data.travelDate,
    additionalRequests,
    status,
    Number(data.totalPrice),
    nowIso,
    nowIso
  );

  return getBookingByReference(db, reference);
}

/**
 * Retrieves a booking by its unique booking reference.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} reference
 * @returns {Object|null}
 */
export function getBookingByReference(db, reference) {
  if (!reference) return null;
  const row = db.prepare(`
    SELECT 
      b.*,
      p.title as package_title,
      p.destination as package_destination,
      p.price as package_price
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    WHERE b.booking_reference = ?
  `).get(reference);

  return mapBookingRow(row);
}

/**
 * Retrieves a booking by its numeric ID.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} id
 * @returns {Object|null}
 */
export function getBookingById(db, id) {
  if (!id) return null;
  const row = db.prepare(`
    SELECT 
      b.*,
      p.title as package_title,
      p.destination as package_destination,
      p.price as package_price
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    WHERE b.id = ?
  `).get(id);

  return mapBookingRow(row);
}

/**
 * Retrieves all bookings ordered by creation date descending.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {Array<Object>}
 */
export function getAllBookings(db) {
  const rows = db.prepare(`
    SELECT 
      b.*,
      p.title as package_title,
      p.destination as package_destination,
      p.price as package_price
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    ORDER BY b.created_at DESC, b.id DESC
  `).all();

  return rows.map(mapBookingRow);
}
