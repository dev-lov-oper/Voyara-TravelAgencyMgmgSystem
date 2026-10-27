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
  handleAgentLogin,
  handleGetAgentBookings,
  handleUpdateBookingStatus,
} from './controllers/bookingController.js';
import { authenticateCustomerRequest, authenticateAgentRequest } from './auth.js';


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
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      return req.body;
    }
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try {
        return JSON.parse(req.body);
      } catch (err) {
        throw new Error(`Invalid JSON payload: ${err.message}`);
      }
    }
  }

  return new Promise((resolve, reject) => {
    let body = '';
    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }
    req.on('data', (chunk) => {
      body += chunk;
      // Prevent payload floods (> 1MB)
      if (body.length > 1e6) {
        if (typeof req.destroy === 'function') req.destroy();
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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Auth-Token, X-Customer-Token',
    });
    res.end(JSON.stringify(payload));
  };

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
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

    // 0b. POST /api/auth/agent-session or /api/agent/login (Agent authentication session)
    if (method === 'POST' && (pathname === '/api/auth/agent-session' || pathname === '/api/agent/login')) {
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
      const result = handleAgentLogin(targetDb, body);
      sendJson(result.status, result.body);
      return;
    }

    // 0c. GET /api/agent/bookings (Agent dashboard - retrieve all customer bookings)
    if (method === 'GET' && (pathname === '/api/agent/bookings' || pathname === '/api/agent/bookings/')) {
      const authResult = authenticateAgentRequest(req);
      if (!authResult.authenticated) {
        sendJson(authResult.status || 401, {
          success: false,
          message: authResult.error || 'Agent authentication required to access bookings.',
        });
        return;
      }
      const result = handleGetAgentBookings(targetDb, authResult.agent);
      sendJson(result.status, result.body);
      return;
    }

    // 0d. PATCH or POST /api/agent/bookings/:reference/status (Update booking status: Confirmed or Rejected)
    const agentStatusMatch = pathname.match(/^\/api\/agent\/bookings\/([a-zA-Z0-9_-]+)\/status\/?$/);
    if ((method === 'PATCH' || method === 'POST' || method === 'PUT') && agentStatusMatch) {
      const reference = agentStatusMatch[1];
      const authResult = authenticateAgentRequest(req);
      if (!authResult.authenticated) {
        sendJson(authResult.status || 401, {
          success: false,
          message: authResult.error || 'Agent authentication required.',
        });
        return;
      }
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
      const result = handleUpdateBookingStatus(targetDb, reference, body?.status, authResult.agent);
      sendJson(result.status, result.body);
      return;
    }

    // 0e. POST /api/agent/bookings/:reference/confirm (Confirm pending booking)
    const agentConfirmMatch = pathname.match(/^\/api\/agent\/bookings\/([a-zA-Z0-9_-]+)\/confirm\/?$/);
    if (method === 'POST' && agentConfirmMatch) {
      const reference = agentConfirmMatch[1];
      const authResult = authenticateAgentRequest(req);
      if (!authResult.authenticated) {
        sendJson(authResult.status || 401, {
          success: false,
          message: authResult.error || 'Agent authentication required.',
        });
        return;
      }
      const result = handleUpdateBookingStatus(targetDb, reference, 'Confirmed', authResult.agent);
      sendJson(result.status, result.body);
      return;
    }

    // 0f. POST /api/agent/bookings/:reference/reject (Reject pending booking)
    const agentRejectMatch = pathname.match(/^\/api\/agent\/bookings\/([a-zA-Z0-9_-]+)\/reject\/?$/);
    if (method === 'POST' && agentRejectMatch) {
      const reference = agentRejectMatch[1];
      const authResult = authenticateAgentRequest(req);
      if (!authResult.authenticated) {
        sendJson(authResult.status || 401, {
          success: false,
          message: authResult.error || 'Agent authentication required.',
        });
        return;
      }
      const result = handleUpdateBookingStatus(targetDb, reference, 'Rejected', authResult.agent);
      sendJson(result.status, result.body);
      return;
    }

    // 1. GET /api/packages
    if (method === 'GET' && (pathname === '/api/packages' || pathname === '/api/packages/')) {
      const destinationParam = urlObj.searchParams.get('destination') || urlObj.searchParams.get('search');
      const minBudgetParam = urlObj.searchParams.get('minBudget') || urlObj.searchParams.get('min');
      const maxBudgetParam = urlObj.searchParams.get('maxBudget') || urlObj.searchParams.get('max');
      const packages = getAllPackages(targetDb, { 
        activeOnly: true,
        destination: destinationParam,
        minBudget: minBudgetParam,
        maxBudget: maxBudgetParam,
      });
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
