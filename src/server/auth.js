/**
 * Authentication and Token Management Layer for Voyara TAMS (TAMS-37)
 * Implements signed, tamper-proof customer authentication tokens using native node:crypto.
 */
import crypto from 'node:crypto';

// Server-side HMAC secret key (configurable via env, with fallback for local dev)
const AUTH_SECRET = process.env.VOYARA_AUTH_SECRET || 'voyara-tams-secure-jwt-auth-token-secret-key-2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Base64URL encode a string or Buffer.
 *
 * @param {string|Buffer} input
 * @returns {string}
 */
function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decode to string.
 *
 * @param {string} str
 * @returns {string}
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Generates HMAC-SHA256 signature for given data.
 *
 * @param {string} data
 * @param {string} [secret]
 * @returns {string} Base64URL signature
 */
function signData(data, secret = AUTH_SECRET) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return base64UrlEncode(hmac.digest());
}

/**
 * Creates a signed customer authentication token.
 *
 * @param {Object} customerData
 * @param {string} customerData.email - Customer email address (required)
 * @param {string} [customerData.fullName] - Customer full name
 * @param {number} [expiresInMs] - Token validity duration in milliseconds
 * @param {string} [secret] - Optional secret override for testing
 * @returns {string} Signed token format: header.payload.signature
 */
export function createCustomerToken(customerData, expiresInMs = TOKEN_EXPIRY_MS, secret = AUTH_SECRET) {
  if (!customerData || !customerData.email || typeof customerData.email !== 'string') {
    throw new Error('Valid customer email is required to create an auth token.');
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Date.now();
  const payload = {
    email: customerData.email.trim().toLowerCase(),
    fullName: (customerData.fullName || '').trim(),
    role: 'customer',
    iat: now,
    exp: now + expiresInMs,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signData(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a customer authentication token.
 *
 * @param {string} token
 * @param {string} [secret]
 * @returns {Object|null} Decoded customer payload if valid, null otherwise
 */
export function verifyCustomerToken(token, secret = AUTH_SECRET) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;

  // 1. Recompute and verify signature using constant-time comparison
  const expectedSignature = signData(`${encodedHeader}.${encodedPayload}`, secret);
  try {
    const receivedBuf = Buffer.from(receivedSignature, 'utf-8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  // 3. Verify expiration
  if (payload.exp && Date.now() > payload.exp) {
    return null; // Expired
  }

  // 4. Verify required fields
  if (!payload.email || typeof payload.email !== 'string') {
    return null;
  }

  return {
    email: payload.email.trim().toLowerCase(),
    fullName: payload.fullName || '',
    role: payload.role || 'customer',
    iat: payload.iat,
    exp: payload.exp,
  };
}

/**
 * Extracts authentication token from incoming HTTP request headers.
 * Supports:
 * - "Authorization: Bearer <token>"
 * - "x-auth-token: <token>"
 * - "x-customer-token: <token>"
 *
 * @param {import('node:http').IncomingMessage|Object} req
 * @returns {string|null}
 */
export function extractAuthToken(req) {
  if (!req || !req.headers) return null;

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/i);
    if (match) {
      return match[1];
    }
    // Also accept raw token in authorization if without prefix
    if (!authHeader.includes(' ')) {
      return authHeader.trim();
    }
  }

  const customToken =
    req.headers['x-auth-token'] ||
    req.headers['x-customer-token'] ||
    req.headers['X-Auth-Token'] ||
    req.headers['X-Customer-Token'];

  if (customToken && typeof customToken === 'string') {
    return customToken.trim();
  }

  return null;
}

/**
 * Authenticates an incoming customer HTTP request.
 *
 * @param {import('node:http').IncomingMessage|Object} req
 * @param {string} [secret]
 * @returns {{ authenticated: boolean, customer?: Object, status?: number, error?: string }}
 */
export function authenticateCustomerRequest(req, secret = AUTH_SECRET) {
  const token = extractAuthToken(req);

  if (!token) {
    return {
      authenticated: false,
      status: 401,
      error: 'Authentication required. Please provide a valid customer authentication token in the Authorization header.',
    };
  }

  const customer = verifyCustomerToken(token, secret);
  if (!customer) {
    return {
      authenticated: false,
      status: 401,
      error: 'Invalid or expired customer authentication credentials. Please sign in again.',
    };
  }

  return {
    authenticated: true,
    customer,
  };
}
