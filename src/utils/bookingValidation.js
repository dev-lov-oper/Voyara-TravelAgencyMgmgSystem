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
  // Must consist only of valid phone characters
  const validCharsRegex = /^[\d\s\-()+]+$/;
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
  const num = Number(count);
  return Number.isInteger(num) && num >= 1;
}

/**
 * Validates that a date is not in the past (comparing against local today 00:00:00).
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isValidTravelDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const selectedDate = new Date(`${dateStr}T00:00:00`);
  if (isNaN(selectedDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selectedDate >= today;
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
