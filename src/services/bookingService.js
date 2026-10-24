/**
 * Booking Service for Travel Agency Management System (TAMS)
 * Handles client-side API communication for booking creation and retrieval.
 */

import { getStoredCustomerToken, setStoredCustomerSession } from './authService.js';

// Safe environment accessor working in both Vite and Node.js environments
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
 * Custom error class for API errors with field-specific validation details.
 */
export class BookingApiError extends Error {
  constructor(message, status = 500, errors = {}) {
    super(message);
    this.name = 'BookingApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Submits a new booking request to the backend API.
 * Automatically saves customer auth session if a token is issued by the backend.
 *
 * @param {Object} bookingData - Booking details
 * @param {string} bookingData.packageId
 * @param {string} bookingData.fullName
 * @param {string} bookingData.email
 * @param {string} bookingData.phone
 * @param {number|string} bookingData.travelerCount
 * @param {string} bookingData.travelDate
 * @param {string} [bookingData.additionalRequests]
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>} Created booking response object
 */
export async function createBooking(bookingData, { signal } = {}) {
  const endpoint = `${API_BASE_URL}/bookings`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
      signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `Booking failed (HTTP ${response.status}: ${response.statusText})`;
      throw new BookingApiError(errorMessage, response.status, data.errors || {});
    }

    // Persist authenticated customer session if token is provided
    if (data.token) {
      setStoredCustomerSession(data.token, data.customer);
    }

    return {
      success: true,
      message: data.message || 'Booking created successfully.',
      booking: data.booking || data,
      token: data.token || null,
      customer: data.customer || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof BookingApiError) {
      throw error;
    }

    // Network / connection error
    throw new BookingApiError(
      error.message || 'Unable to connect to the booking service. Please check your network connection and try again.',
      0,
      {}
    );
  }
}

/**
 * Retrieves a booking by its reference.
 *
 * @param {string} reference
 * @param {Object} [options]
 * @param {string} [options.token] - Optional explicit auth token override
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object|null>}
 */
export async function getBookingByReference(reference, { token, signal } = {}) {
  if (!reference) return null;
  const endpoint = `${API_BASE_URL}/bookings/${encodeURIComponent(reference)}`;

  const effectiveToken = token || getStoredCustomerToken();
  const headers = {
    'Accept': 'application/json',
  };
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorMessage = data.message || `Failed to fetch booking (HTTP ${response.status}: ${response.statusText})`;
      throw new BookingApiError(errorMessage, response.status, data.errors || {});
    }

    return data.booking || data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof BookingApiError) {
      throw error;
    }
    throw new BookingApiError(
      error.message || 'Unable to connect to the booking service. Please check your network connection and try again.',
      0,
      {}
    );
  }
}

/**
 * Retrieves booking records for the authenticated customer from the backend API.
 * Attaches the customer's authorization token to enforce customer-level data isolation.
 *
 * @param {Object} [options]
 * @param {string} [options.token] - Optional explicit auth token override
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<Object>>}
 */
export async function getAllBookings({ token, signal } = {}) {
  const endpoint = `${API_BASE_URL}/bookings`;

  const effectiveToken = token || getStoredCustomerToken();
  const headers = {
    'Accept': 'application/json',
  };
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `Failed to fetch bookings (HTTP ${response.status}: ${response.statusText})`;
      throw new BookingApiError(errorMessage, response.status, data.errors || {});
    }

    return Array.isArray(data.bookings) ? data.bookings : (Array.isArray(data) ? data : []);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof BookingApiError) {
      throw error;
    }
    throw new BookingApiError(
      error.message || 'Unable to connect to the booking service. Please check your network connection and try again.',
      0,
      {}
    );
  }
}

// Semantic alias for customer booking retrieval (TAMS-37)
export const getCustomerBookings = getAllBookings;


