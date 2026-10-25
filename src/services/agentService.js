/**
 * Agent Service for Voyara TAMS (TAMS-39)
 * Handles client-side API requests for agent authentication and booking retrieval.
 */

const AGENT_TOKEN_STORAGE_KEY = 'voyara_agent_token';
const AGENT_INFO_STORAGE_KEY = 'voyara_agent_info';

/**
 * Retrieves the stored agent auth token from browser storage.
 *
 * @returns {string|null}
 */
export function getStoredAgentToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage?.getItem(AGENT_TOKEN_STORAGE_KEY) ||
           window.sessionStorage?.getItem(AGENT_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves stored agent profile information.
 *
 * @returns {Object|null}
 */
export function getStoredAgentInfo() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage?.getItem(AGENT_INFO_STORAGE_KEY) ||
                window.sessionStorage?.getItem(AGENT_INFO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Stores agent session credentials in browser storage.
 *
 * @param {Object} session
 * @param {string} session.token
 * @param {Object} [session.agent]
 */
export function storeAgentSession({ token, agent }) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage?.setItem(AGENT_TOKEN_STORAGE_KEY, token);
      window.sessionStorage?.setItem(AGENT_TOKEN_STORAGE_KEY, token);
    }
    if (agent) {
      const serialized = JSON.stringify(agent);
      window.localStorage?.setItem(AGENT_INFO_STORAGE_KEY, serialized);
      window.sessionStorage?.setItem(AGENT_INFO_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota or access issues
  }
}

/**
 * Clears stored agent session credentials.
 */
export function clearStoredAgentSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(AGENT_TOKEN_STORAGE_KEY);
    window.sessionStorage?.removeItem(AGENT_TOKEN_STORAGE_KEY);
    window.localStorage?.removeItem(AGENT_INFO_STORAGE_KEY);
    window.sessionStorage?.removeItem(AGENT_INFO_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Authenticates an agent via credentials.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function loginAgent(credentials, options = {}) {
  const response = await fetch('/api/auth/agent-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
    signal: options.signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || 'Agent authentication failed.');
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  if (data.token) {
    storeAgentSession({ token: data.token, agent: data.agent });
  }

  return data;
}

/**
 * Retrieves all customer booking requests for the agent dashboard.
 *
 * @param {Object} [options]
 * @param {string} [options.token] - Explicit auth token
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<Array<Object>>}
 */
export async function getAgentBookings(options = {}) {
  const token = options.token || getStoredAgentToken();

  if (!token) {
    const error = new Error('Agent authentication token is missing or expired. Please sign in as an agent.');
    error.status = 401;
    throw error;
  }

  const response = await fetch('/api/agent/bookings', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'x-auth-token': token,
    },
    signal: options.signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || 'Failed to load booking requests.');
    error.status = response.status;
    throw error;
  }

  return Array.isArray(data.bookings) ? data.bookings : [];
}

/**
 * Updates a booking status to Confirmed or Rejected (TAMS-40).
 *
 * @param {Object} options
 * @param {string} options.bookingReference - The booking reference code
 * @param {'Confirmed'|'Rejected'} options.status - The new status
 * @param {string} [options.token] - Optional agent auth token override
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export async function updateBookingStatus({ bookingReference, status, token, signal } = {}) {
  const authToken = token || getStoredAgentToken();

  if (!authToken) {
    const error = new Error('Agent authentication token is missing or expired. Please sign in as an agent.');
    error.status = 401;
    throw error;
  }

  if (!bookingReference) {
    const error = new Error('Booking reference is required to update status.');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`/api/agent/bookings/${encodeURIComponent(bookingReference)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      'x-auth-token': authToken,
    },
    body: JSON.stringify({ status }),
    signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || `Failed to update booking status to ${status}.`);
    error.status = response.status;
    error.booking = data.booking || null;
    throw error;
  }

  return data;
}

/**
 * Confirms a pending customer booking (TAMS-40).
 *
 * @param {Object} options
 * @param {string} options.bookingReference
 * @param {string} [options.token]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>}
 */
export async function confirmBooking({ bookingReference, token, signal } = {}) {
  return updateBookingStatus({ bookingReference, status: 'Confirmed', token, signal });
}

/**
 * Rejects a pending customer booking (TAMS-40).
 *
 * @param {Object} options
 * @param {string} options.bookingReference
 * @param {string} [options.token]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>}
 */
export async function rejectBooking({ bookingReference, token, signal } = {}) {
  return updateBookingStatus({ bookingReference, status: 'Rejected', token, signal });
}

