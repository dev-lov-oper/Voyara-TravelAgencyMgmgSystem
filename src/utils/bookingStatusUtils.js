/**
 * Booking Status Utilities (TAMS-36)
 * Helper functions for formatting dates and mapping status values to CSS classes.
 */

/**
 * Formats an ISO or SQLite date string into a readable date for display.
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatBookingDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Resolves CSS status class corresponding to booking status value.
 * Supported status values: Pending, Confirmed, Rejected.
 *
 * @param {string} status
 * @returns {string}
 */
export function getStatusClass(status) {
  const normalized = (status || '').toLowerCase().trim();
  if (normalized === 'confirmed') return 'status-confirmed';
  if (normalized === 'rejected') return 'status-rejected';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'status-cancelled';
  return 'status-pending';
}
