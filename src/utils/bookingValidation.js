/**
 * Booking Form Validation Utilities (TAMS-33)
 * Pure helper functions for client-side input validation.
 */

/**
 * Validates an email address.
 * Standard format: user@domain.tld
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Standard RFC 5322 compliant regex for practical client validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates a phone number for the project's intended users.
 * Supports standard 10-digit Indian mobile numbers, optional +91/country code,
 * spaces, hyphens, and standard international formats (10 to 15 digits).
 *
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  // Strip allowed formatting characters: spaces, hyphens, parentheses, plus
  const digitsOnly = trimmed.replace(/[\s\-()+]/g, '');
  // Must consist only of valid phone characters and optionally start with a single '+'
  const validCharsRegex = /^\+?[\d\s\-()]+$/;
  if (!validCharsRegex.test(trimmed)) return false;
  // Must contain between 10 and 15 numeric digits
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validates that traveler count is a positive whole integer (min 1).
 *
 * @param {number|string} count
 * @returns {boolean}
 */
export function isValidTravelerCount(count) {
  if (count === undefined || count === null || count === '') return false;
  if (typeof count === 'boolean') return false;
  if (typeof count !== 'number' && typeof count !== 'string') return false;
  if (typeof count === 'string') {
    const trimmed = count.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) return false;
  }
  const num = Number(count);
  return Number.isInteger(num) && num >= 1;
}

/**
 * Validates that a date is a valid calendar date in YYYY-MM-DD format and not in the past.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isValidTravelDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [year, month, day] = trimmed.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Verify it is a valid calendar date (prevents rollover like Feb 31 or Apr 31)
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dateObj >= today;
}

/**
 * Helper to get today's date formatted as YYYY-MM-DD for min date attribute.
 *
 * @returns {string}
 */
export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
