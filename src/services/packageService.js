/**
 * Package Service for Travel Agency Management System (TAMS)
 * Handles API communication, response mapping, and isolated fallback data.
 */
import { SAMPLE_PACKAGES } from '../data/packages.js';

// Safe environment accessor working in both Vite and Node.js test environments
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
const isDev = Boolean(getEnv('DEV') || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'));

/**
 * Normalizes and safely maps API response fields to UI package format.
 * Prevents UI crashes if optional fields are absent or differently named in the backend.
 * 
 * @param {Object} raw - Raw package object from backend API or data source
 * @returns {Object} Normalized package object
 */
export function normalizePackage(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw._id || raw.package_id || `pkg-${Math.random().toString(36).substring(2, 9)}`;
  const title = raw.title || raw.name || raw.package_name || 'Curated Escape';
  const destination = raw.destination || raw.location || raw.city || 'India';
  
  // Safe duration calculation
  const rawDuration = raw.duration ?? raw.duration_days ?? raw.durationDays ?? raw.days ?? 1;
  const durationNumber = Number(rawDuration) || 1;
  const durationText = raw.durationText || `${durationNumber} day${durationNumber > 1 ? 's' : ''}`;

  // Safe price calculation and Indian Rupee formatting
  const rawPrice = raw.price ?? raw.cost ?? raw.base_price ?? raw.amount ?? 0;
  const priceNumber = Number(rawPrice) || 0;
  const formattedPrice = raw.formattedPrice || (
    priceNumber > 0 
      ? `₹${priceNumber.toLocaleString('en-IN')}` 
      : 'Inquire for price'
  );

  const description = raw.description || raw.summary || raw.details || 'Explore this handpicked travel itinerary with Voyara.';
  
  // Safe image mapping with high-quality fallback
  const imageUrl = raw.imageUrl || raw.image_url || raw.image || raw.photo_url || 
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  const imageAlt = raw.imageAlt || raw.image_alt || `${title} in ${destination}`;
  const category = raw.category || raw.tag || 'Curated Trip';
  
  // Status check (support active / is_active if backend provides it)
  const isActive = raw.isActive ?? raw.is_active ?? (raw.status ? raw.status.toLowerCase() === 'active' : true);

  return {
    id: String(id),
    title: String(title),
    destination: String(destination),
    duration: durationNumber,
    durationText: String(durationText),
    price: priceNumber,
    formattedPrice: String(formattedPrice),
    description: String(description),
    imageUrl: String(imageUrl),
    imageAlt: String(imageAlt),
    category: String(category),
    isActive: Boolean(isActive)
  };
}

/**
 * Fetches available travel packages from backend API.
 * Falls back to isolated sample mock data if backend server is not reachable in development.
 * 
 * @param {Object} options
 * @param {AbortSignal} [options.signal] - AbortController signal for cleanup
 * @param {boolean} [options.forceMock] - Reviewer override to load sample data
 * @returns {Promise<Array>} Array of normalized package objects
 */
export async function getTravelPackages({ signal, forceMock = false } = {}) {
  // If explicitly requested to use mock data or configured via environment
  if (forceMock || getEnv('VITE_USE_MOCK') === 'true') {
    // Simulate brief network latency for realistic loading experience
    await new Promise((resolve) => setTimeout(resolve, 50));
    return SAMPLE_PACKAGES.map(normalizePackage).filter(pkg => pkg && pkg.isActive);
  }

  const endpoint = `${API_BASE_URL}/packages`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal
    });

    if (!response.ok) {
      // If 404 or server error in local development where no backend process is bound,
      // fallback to mock data with a console notice so local reviewer has functional UI
      if (response.status === 404 && isDev) {
        console.warn(`[PackageService] Backend endpoint ${endpoint} returned 404. Falling back to isolated mock data.`);
        return SAMPLE_PACKAGES.map(normalizePackage).filter(pkg => pkg && pkg.isActive);
      }
      throw new Error(`Failed to fetch travel packages (HTTP ${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    
    // Support various common API envelope formats:
    // 1) [ {...}, {...} ]
    // 2) { data: [ {...} ] }
    // 3) { packages: [ {...} ] }
    // 4) { results: [ {...} ] }
    const rawList = Array.isArray(data) 
      ? data 
      : (data.data || data.packages || data.results || []);

    if (!Array.isArray(rawList)) {
      throw new Error('Unexpected API response structure: expected an array of packages.');
    }

    // Map, normalize, and filter for active packages
    return rawList
      .map(normalizePackage)
      .filter(pkg => pkg && pkg.isActive);

  } catch (error) {
    if (error.name === 'AbortError') {
      // Abort is standard component cleanup, rethrow so callers know it was cancelled
      throw error;
    }

    // In local development when backend is not running, provide graceful fallback
    if (isDev && (error.message.includes('Failed to fetch') || error.message.includes('fetch failed') || error.message.includes('NetworkError'))) {
      console.warn(`[PackageService] Cannot connect to ${endpoint}. Serving isolated sample dataset. (Set VITE_API_URL to point to a live backend)`);
      return SAMPLE_PACKAGES.map(normalizePackage).filter(pkg => pkg && pkg.isActive);
    }

    throw error;
  }
}
