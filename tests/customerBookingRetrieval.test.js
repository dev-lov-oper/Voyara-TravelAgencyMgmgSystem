import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { createBooking, getBookingsByCustomer } from '../src/server/models/bookingModel.js';
import { handleApiRequest } from '../src/server/apiHandler.js';
import {
  createCustomerToken,
  verifyCustomerToken,
  authenticateCustomerRequest,
} from '../src/server/auth.js';
import { getAllBookings, BookingApiError } from '../src/services/bookingService.js';
import {
  setStoredCustomerSession,
  getStoredCustomerToken,
  getStoredCustomerInfo,
  clearStoredCustomerSession,
} from '../src/services/authService.js';
import BookingStatus from '../src/components/BookingStatus.jsx';

describe('TAMS-37: Customer Booking Records & Status Retrieval', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
    vi.restoreAllMocks();
  });

  // Helper to dispatch mock HTTP requests to handleApiRequest
  const executeApiRequest = async (options) => {
    let statusCode = null;
    let responseHeaders = {};
    let responseBody = '';

    const req = {
      method: options.method || 'GET',
      url: options.url || '/api/bookings',
      headers: options.headers || {},
      on: (event, handler) => {
        if (event === 'data' && options.body) {
          handler(Buffer.from(JSON.stringify(options.body)));
        }
        if (event === 'end') {
          handler();
        }
      },
    };

    const res = {
      writeHead: (status, headers) => {
        statusCode = status;
        if (headers) responseHeaders = headers;
      },
      end: (data) => {
        responseBody = data;
      },
    };

    await handleApiRequest(req, res, db);
    return {
      status: statusCode,
      headers: responseHeaders,
      body: responseBody ? JSON.parse(responseBody) : null,
    };
  };

  describe('1. Authentication Enforcement (Unauthenticated & Invalid Credentials)', () => {
    it('rejects GET /api/bookings with HTTP 401 when no authorization credentials are provided', async () => {
      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('rejects GET /api/bookings with HTTP 401 when token is tampered or signature is invalid', async () => {
      const validToken = createCustomerToken({ email: 'tamper.test@voyara.com', fullName: 'Tamper Test' });
      // Tamper signature part
      const tamperedToken = validToken.substring(0, validToken.lastIndexOf('.') + 1) + 'INVALID_SIGNATURE';

      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('rejects GET /api/bookings with HTTP 401 when token has expired', async () => {
      // Create a token expired 10 seconds ago
      const expiredToken = createCustomerToken(
        { email: 'expired.test@voyara.com', fullName: 'Expired Test' },
        -10000
      );

      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('accepts authorization via both Bearer header and x-auth-token custom header', async () => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Header Test User',
        email: 'headertest@voyara.com',
        phone: '+91 99887 76655',
        travelerCount: 2,
        travelDate: '2027-05-15',
        totalPrice: 25998,
      });

      const token = createCustomerToken({ email: 'headertest@voyara.com', fullName: 'Header Test User' });

      // Via x-auth-token
      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: {
          'x-auth-token': token,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bookings.length).toBe(1);
    });
  });

  describe('2. Customer Isolation & IDOR Protection', () => {
    it('ensures Customer A cannot view Customer B booking records', async () => {
      // Create booking for Customer A
      const bookingA = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Customer Alpha',
        email: 'alpha@traveler.com',
        phone: '+91 98765 00001',
        travelerCount: 2,
        travelDate: '2027-06-10',
        additionalRequests: 'Alpha request',
        status: 'Pending',
        totalPrice: 25998,
      });

      // Create booking for Customer B
      const bookingB = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Customer Beta',
        email: 'beta@traveler.com',
        phone: '+91 98765 00002',
        travelerCount: 4,
        travelDate: '2027-07-20',
        additionalRequests: 'Beta request',
        status: 'Confirmed',
        totalPrice: 73996,
      });

      // Authenticate as Customer A
      const tokenA = createCustomerToken({ email: 'alpha@traveler.com', fullName: 'Customer Alpha' });
      const responseA = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(responseA.status).toBe(200);
      expect(responseA.body.bookings.length).toBe(1);
      expect(responseA.body.bookings[0].bookingReference).toBe(bookingA.bookingReference);
      expect(responseA.body.bookings[0].email).toBe('alpha@traveler.com');

      // Ensure Customer B's booking is NOT present
      const hasBookingB = responseA.body.bookings.some((b) => b.bookingReference === bookingB.bookingReference);
      expect(hasBookingB).toBe(false);

      // Authenticate as Customer B
      const tokenB = createCustomerToken({ email: 'beta@traveler.com', fullName: 'Customer Beta' });
      const responseB = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${tokenB}` },
      });

      expect(responseB.status).toBe(200);
      expect(responseB.body.bookings.length).toBe(1);
      expect(responseB.body.bookings[0].bookingReference).toBe(bookingB.bookingReference);
      expect(responseB.body.bookings[0].email).toBe('beta@traveler.com');

      // Ensure Customer A's booking is NOT present
      const hasBookingA = responseB.body.bookings.some((b) => b.bookingReference === bookingA.bookingReference);
      expect(hasBookingA).toBe(false);
    });

    it('prevents IDOR parameter tampering (query params or body cannot override token identity)', async () => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Legitimate Owner',
        email: 'victim@traveler.com',
        phone: '+91 98765 11111',
        travelerCount: 1,
        travelDate: '2027-08-01',
        status: 'Confirmed',
        totalPrice: 12999,
      });

      // Attacker token
      const attackerToken = createCustomerToken({ email: 'attacker@badactor.com', fullName: 'Attacker' });

      // Attacker tries to inject victim's email in query param
      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings?email=victim@traveler.com&customerId=1',
        headers: { authorization: `Bearer ${attackerToken}` },
      });

      expect(response.status).toBe(200);
      // Attacker should only get 0 bookings (their own), NOT victim's
      expect(response.body.bookings.length).toBe(0);
      expect(response.body.customer.email).toBe('attacker@badactor.com');
    });

    it('enforces customer authorization when retrieving individual booking by reference', async () => {
      const victimBooking = createBooking(db, {
        packageId: 'pkg-3',
        fullName: 'Victim Customer',
        email: 'victim2@traveler.com',
        phone: '+91 98765 22222',
        travelerCount: 2,
        travelDate: '2027-09-01',
        status: 'Pending',
        totalPrice: 17998,
      });

      const attackerToken = createCustomerToken({ email: 'attacker2@badactor.com', fullName: 'Attacker 2' });

      // Attacker tries to fetch victim's booking reference
      const response = await executeApiRequest({
        method: 'GET',
        url: `/api/bookings/${victimBooking.bookingReference}`,
        headers: { authorization: `Bearer ${attackerToken}` },
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('rejects unauthenticated access to GET /api/bookings/:reference with HTTP 401', async () => {
      const victimBooking = createBooking(db, {
        packageId: 'pkg-3',
        fullName: 'Victim Customer',
        email: 'victim3@traveler.com',
        phone: '+91 98765 33333',
        travelerCount: 1,
        travelDate: '2027-09-01',
        totalPrice: 8999,
      });

      const response = await executeApiRequest({
        method: 'GET',
        url: `/api/bookings/${victimBooking.bookingReference}`,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });
  });

  describe('3. Required Booking Fields & Accurate Data Mapping', () => {
    it('returns all required booking attributes including reference, package details, dates, travelers, and status', async () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 98765 43210',
        travelerCount: 3,
        travelDate: '2027-10-15',
        additionalRequests: 'Ground floor room',
        status: 'Pending',
        totalPrice: 38997,
      });

      const token = createCustomerToken({ email: 'priya.sharma@example.com', fullName: 'Priya Sharma' });
      const response = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const booking = response.body.bookings[0];

      // Booking Reference
      expect(booking.bookingReference).toBe(created.bookingReference);
      // Package Name / Details
      expect(booking.packageTitle).toBe('Coastal Escape');
      expect(booking.packageDestination).toBe('Goa');
      expect(booking.packageId).toBe('pkg-1');
      // Booking Date (createdAt)
      expect(booking.createdAt).toBeDefined();
      // Scheduled Travel Date
      expect(booking.travelDate).toBe('2027-10-15');
      // Traveler Count
      expect(booking.travelerCount).toBe(3);
      // Status
      expect(booking.status).toBe('Pending');
      // Price
      expect(booking.totalPrice).toBe(38997);
      expect(booking.formattedTotal).toBe('₹38,997');
      // Additional Requests
      expect(booking.additionalRequests).toBe('Ground floor room');
    });
  });

  describe('4. Dynamic Status Persistence & Live Updates', () => {
    it('reflects updated status when booking is confirmed or rejected in database', async () => {
      const booking = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '+91 98765 99999',
        travelerCount: 2,
        travelDate: '2027-11-01',
        status: 'Pending',
        totalPrice: 36998,
      });

      const token = createCustomerToken({ email: 'rahul.verma@example.com', fullName: 'Rahul Verma' });

      // Initial check -> Pending
      let res = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.body.bookings[0].status).toBe('Pending');

      // Simulate status transition in database: Pending -> Confirmed
      db.prepare("UPDATE bookings SET status = 'Confirmed' WHERE booking_reference = ?").run(booking.bookingReference);

      res = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.body.bookings[0].status).toBe('Confirmed');

      // Simulate status transition in database: Confirmed -> Rejected
      db.prepare("UPDATE bookings SET status = 'Rejected' WHERE booking_reference = ?").run(booking.bookingReference);

      res = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.body.bookings[0].status).toBe('Rejected');
    });
  });

  describe('5. Empty Result State for New / Unbooked Customer', () => {
    it('returns empty bookings array when authenticated customer has not booked yet', async () => {
      const token = createCustomerToken({ email: 'newuser@example.com', fullName: 'New User' });

      const res = await executeApiRequest({
        method: 'GET',
        url: '/api/bookings',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.bookings)).toBe(true);
      expect(res.body.bookings.length).toBe(0);
      expect(res.body.customer.email).toBe('newuser@example.com');
    });
  });

  describe('6. Customer Login Endpoint (POST /api/auth/customer-session)', () => {
    it('authenticates customer with valid registered email and matching booking reference', async () => {
      const booking = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Session User',
        email: 'session.user@voyara.com',
        phone: '+91 98765 88888',
        travelerCount: 1,
        travelDate: '2027-04-10',
        totalPrice: 12999,
      });

      const res = await executeApiRequest({
        method: 'POST',
        url: '/api/auth/customer-session',
        body: {
          email: 'session.user@voyara.com',
          bookingReference: booking.bookingReference,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.customer.email).toBe('session.user@voyara.com');
      expect(res.body.customer.fullName).toBe('Session User');

      // Verify returned token is cryptographically valid
      const verified = verifyCustomerToken(res.body.token);
      expect(verified).not.toBeNull();
      expect(verified.email).toBe('session.user@voyara.com');
    });

    it('rejects authentication with HTTP 400 when booking reference is missing (prevents unauthorized access by email only)', async () => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Target Customer',
        email: 'target.customer@voyara.com',
        phone: '+91 98765 77777',
        travelerCount: 2,
        travelDate: '2027-04-15',
        totalPrice: 25998,
      });

      // Attacker supplies victim email without booking reference
      const res = await executeApiRequest({
        method: 'POST',
        url: '/api/auth/customer-session',
        body: { email: 'target.customer@voyara.com' },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('booking reference is required');
    });

    it('rejects authentication with HTTP 403 when booking reference does not match customer email', async () => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Target Customer',
        email: 'target.customer@voyara.com',
        phone: '+91 98765 77777',
        travelerCount: 2,
        travelDate: '2027-04-15',
        totalPrice: 25998,
      });

      // Attacker supplies victim email with mismatched / fabricated booking reference
      const res = await executeApiRequest({
        method: 'POST',
        url: '/api/auth/customer-session',
        body: {
          email: 'target.customer@voyara.com',
          bookingReference: 'BK-MISMATCHED-9999',
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not match');
    });

    it('rejects authentication when email is not registered in bookings', async () => {
      const res = await executeApiRequest({
        method: 'POST',
        url: '/api/auth/customer-session',
        body: {
          email: 'unknown.traveler@voyara.com',
          bookingReference: 'BK-20261020-XXXX',
        },
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No booking records found');
    });

    it('rejects authentication with invalid email format', async () => {
      const res = await executeApiRequest({
        method: 'POST',
        url: '/api/auth/customer-session',
        body: { email: 'not-an-email', bookingReference: 'BK-20261020-XXXX' },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('7. Frontend Component Rendering & State Handling', () => {
    it('renders customer login prompt when customer is unauthenticated and not controlled', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {})
      );

      expect(html).toContain('customer-auth-required-view');
      expect(html).toContain('Customer Authentication Required');
      expect(html).toContain('customer-auth-email');
      expect(html).toContain('Retrieve My Bookings');
    });

    it('renders customer session identity bar when customer prop is provided', () => {
      const mockCustomer = { email: 'ksharvan2007@gmail.com', fullName: 'Sharvan Kotharu' };
      const sampleBookings = [
        {
          id: 10,
          bookingReference: 'BK-20261020-655R',
          packageTitle: 'Coastal Escape',
          travelDate: '2026-10-22',
          travelerCount: 1,
          status: 'Pending',
          createdAt: '2026-10-20T11:35:19.401Z',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          customer: mockCustomer,
        })
      );

      expect(html).toContain('customer-session-bar');
      expect(html).toContain('Signed in as:');
      expect(html).toContain('Sharvan Kotharu');
      expect(html).toContain('ksharvan2007@gmail.com');
      expect(html).toContain('Sign Out / Switch Customer');
      expect(html).toContain('BK-20261020-655R');
    });

    it('renders empty bookings state when customer has no bookings', () => {
      const mockCustomer = { email: 'empty@traveler.com', fullName: 'Empty Traveler' };
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: [],
          customer: mockCustomer,
        })
      );

      expect(html).toContain('No bookings found');
      expect(html).toContain('empty@traveler.com');
      expect(html).toContain('Explore Packages');
    });
  });

  describe('8. Model, Middleware & Client Service Unit Validation', () => {
    it('getBookingsByCustomer directly queries SQLite and enforces case-insensitive email scoping', () => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Model Direct User',
        email: 'Direct.Model@voyara.com',
        phone: '+91 99887 11223',
        travelerCount: 2,
        travelDate: '2027-07-15',
        totalPrice: 25998,
      });

      const records = getBookingsByCustomer(db, 'direct.model@voyara.com');
      expect(records.length).toBe(1);
      expect(records[0].fullName).toBe('Model Direct User');

      // Invalid or non-matching email returns empty array
      expect(getBookingsByCustomer(db, 'nonexistent@voyara.com')).toEqual([]);
      expect(getBookingsByCustomer(db, null)).toEqual([]);
    });

    it('authenticateCustomerRequest parses and verifies HTTP request headers', () => {
      const token = createCustomerToken({ email: 'req.test@voyara.com', fullName: 'Req Test' });

      // Valid Bearer
      const auth1 = authenticateCustomerRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      expect(auth1.authenticated).toBe(true);
      expect(auth1.customer.email).toBe('req.test@voyara.com');

      // Missing
      const auth2 = authenticateCustomerRequest({ headers: {} });
      expect(auth2.authenticated).toBe(false);
      expect(auth2.status).toBe(401);

      // Invalid
      const auth3 = authenticateCustomerRequest({
        headers: { authorization: 'Bearer invalid.token.signature' },
      });
      expect(auth3.authenticated).toBe(false);
      expect(auth3.status).toBe(401);
    });

    it('getAllBookings client service attaches token in headers and catches 401 error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ success: false, message: 'Authentication required' }),
      });

      await expect(getAllBookings({ token: 'test-token' })).rejects.toThrow(BookingApiError);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/bookings',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('authService manages localStorage persistence lifecycle cleanly', () => {
      const mockStorage = {};
      vi.stubGlobal('window', {
        localStorage: {
          getItem: (key) => mockStorage[key] || null,
          setItem: (key, val) => {
            mockStorage[key] = String(val);
          },
          removeItem: (key) => {
            delete mockStorage[key];
          },
        },
        dispatchEvent: vi.fn(),
      });

      setStoredCustomerSession('token-12345', { email: 'stored@user.com', fullName: 'Stored User' });
      expect(getStoredCustomerToken()).toBe('token-12345');
      expect(getStoredCustomerInfo().email).toBe('stored@user.com');

      clearStoredCustomerSession();
      expect(getStoredCustomerToken()).toBeNull();
      expect(getStoredCustomerInfo()).toBeNull();

      vi.unstubAllGlobals();
    });
  });
});

