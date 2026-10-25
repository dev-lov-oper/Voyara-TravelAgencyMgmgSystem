/**
 * Central API Request Dispatcher for Voyara TAMS
 * Dispatches HTTP requests to respective controllers and models.
 */
import { getDefaultDatabase } from './db/database.js';
import { runMigrations } from './db/migrations.js';
import { getAllPackages, getPackageById } from './models/packageModel.js';
import {
  handleCreateBooking,

  handleGetBookingByReference,
  handleCustomerLogin,
  handleGetCustomerBookings,
} from './controllers/bookingController.js';
import { authenticateCustomerRequest } from './auth.js';


const initializedDbs = new WeakSet();

/**
 * Ensures the database and migrations are initialized.
 */
export function ensureServerInitialized(db = null) {
  const targetDb = db || getDefaultDatabase();
  if (!initializedDbs.has(targetDb)) {
    runMigrations(targetDb);
    initializedDbs.add(targetDb);
  }
}

/**
 * Helper to read JSON body from incoming HTTP request.
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Object>}
 */
export async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Prevent payload floods (> 1MB)
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body || !body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error(`Invalid JSON payload: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handles incoming API requests for /api/* routes.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {import('node:sqlite').DatabaseSync} [db]
 */
export async function handleApiRequest(req, res, db = null) {
  const targetDb = db || getDefaultDatabase();
  ensureServerInitialized(targetDb);

  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  const method = (req.method || 'GET').toUpperCase();

  // Helper to send JSON responses
  const sendJson = (status, payload) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Auth-Token, X-Customer-Token',
    });
    res.end(JSON.stringify(payload));
  };

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Auth-Token, X-Customer-Token',
    });
    res.end();
    return;
  }

  try {
    // 0. POST /api/auth/customer-session or /api/auth/login (Customer authentication session)
    if (method === 'POST' && (pathname === '/api/auth/customer-session' || pathname === '/api/auth/login')) {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (parseErr) {
        sendJson(400, {
          success: false,
          message: parseErr.message || 'Malformed JSON in request body.',
        });
        return;
      }
      const result = handleCustomerLogin(targetDb, body);
      sendJson(result.status, result.body);
      return;
    }

    // 1. GET /api/packages
    if (method === 'GET' && (pathname === '/api/packages' || pathname === '/api/packages/')) {
      const packages = getAllPackages(targetDb, { activeOnly: true });
      sendJson(200, packages);
      return;
    }

    // 2. GET /api/packages/:id
    const packageMatch = pathname.match(/^\/api\/packages\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && packageMatch) {
      const packageId = packageMatch[1];
      const pkg = getPackageById(targetDb, packageId);
      if (!pkg) {
        sendJson(404, { success: false, message: `Package '${packageId}' not found.` });
        return;
      }
      sendJson(200, pkg);
      return;
    }

    // 3. POST /api/bookings (Create booking request)
    if (method === 'POST' && (pathname === '/api/bookings' || pathname === '/api/bookings/')) {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (parseErr) {
        sendJson(400, {
          success: false,
          message: parseErr.message || 'Malformed JSON in request body.',
        });
        return;
      }
      const result = handleCreateBooking(targetDb, body);
      sendJson(result.status, result.body);
      return;
    }

    // 4. GET /api/bookings/:reference
    const bookingMatch = pathname.match(/^\/api\/bookings\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && bookingMatch) {
      const reference = bookingMatch[1];
      const authResult = authenticateCustomerRequest(req);
      if (!authResult.authenticated) {
        sendJson(401, {
          success: false,
          message: authResult.error || 'Authentication required to access booking details.',
        });
        return;
      }
      const result = handleGetBookingByReference(targetDb, reference, authResult.customer);
      sendJson(result.status, result.body);
      return;
    }

    // 5. GET /api/bookings (Retrieve booking records for the authenticated customer)
    if (method === 'GET' && (pathname === '/api/bookings' || pathname === '/api/bookings/')) {
      const authResult = authenticateCustomerRequest(req);
      if (!authResult.authenticated) {
        sendJson(authResult.status || 401, {
          success: false,
          message: authResult.error || 'Authentication required to access booking records.',
        });
        return;
      }

      const result = handleGetCustomerBookings(targetDb, authResult.customer);
      sendJson(result.status, result.body);
      return;
    }

    // Default 404 for unknown /api route
    sendJson(404, {
      success: false,
      message: `API endpoint '${pathname}' with method '${method}' was not found.`,
    });
  } catch (err) {
    console.error('[ApiHandler] Unhandled server error:', err);
    sendJson(500, {
      success: false,
      message: 'Internal server error while processing request.',
      error: err.message,
    });
  }
}
