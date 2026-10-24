/**
 * Customer Authentication Client Service for Voyara TAMS (TAMS-37)
 * Manages customer credentials, local session storage, and login requests.
 */

const TOKEN_STORAGE_KEY = 'voyara_customer_token';
const CUSTOMER_STORAGE_KEY = 'voyara_customer_info';

// Safe environment accessor
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const API_BASE_URL = getEnv('VITE_API_URL') || '/api';

/**
 * Checks whether localStorage is available in the current environment.
 *
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Retrieves the stored customer authentication token from localStorage.
 *
 * @returns {string|null}
 */
export function getStoredCustomerToken() {
  if (!isLocalStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored customer profile info from localStorage.
 *
 * @returns {{ email: string, fullName: string }|null}
 */
export function getStoredCustomerInfo() {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persists the customer token and profile into localStorage.
 *
 * @param {string} token
 * @param {Object} [customer]
 */
export function setStoredCustomerSession(token, customer = null) {
  if (!isLocalStorageAvailable()) return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    if (customer && typeof customer === 'object') {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    } else {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }

    // Dispatch custom event for reactive UI updates
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('voyara_auth_change', { detail: { token, customer } }));
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Clears the customer authentication session from localStorage.
 */
export function clearStoredCustomerSession() {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('voyara_auth_change', { detail: { token: null, customer: null } }));
    }
  } catch {
    // Ignore error
  }
}

/**
 * Sends customer login / session retrieval request to backend.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} [credentials.bookingReference]
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ success: boolean, token: string, customer: Object }>}
 */
export async function loginCustomer(credentials, { signal } = {}) {
  const endpoint = `${API_BASE_URL}/auth/customer-session`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Authentication failed (HTTP ${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (data.token) {
    setStoredCustomerSession(data.token, data.customer);
  }

  return data;
}
