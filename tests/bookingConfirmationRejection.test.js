import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentBookingDashboard from '../src/components/AgentBookingDashboard.jsx';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { createBooking, getBookingByReference } from '../src/server/models/bookingModel.js';
import { createAgentToken, createCustomerToken } from '../src/server/auth.js';
import { handleApiRequest } from '../src/server/apiHandler.js';
import { handleUpdateBookingStatus, ALLOWED_STATUS_TRANSITIONS } from '../src/server/controllers/bookingController.js';

describe('TAMS-40: Booking Confirmation and Rejection (Agent Actions & Business Rules)', () => {
  let db;
  const agentUser = {
    email: 'agent@voyara.com',
    fullName: 'Voyara Travel Agent',
    role: 'agent',
  };

  const customerUser = {
    email: 'traveler@example.com',
    fullName: 'Rohan Verma',
    role: 'customer',
  };

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  // ---------------------------------------------------------------------------
  // 1. Successful Confirmation & Database Persistence (Requirements 2, 3, 6)
  // ---------------------------------------------------------------------------
  describe('1. Confirmation of Pending Bookings', () => {
    it('successfully confirms a pending booking and persists the status in the database', () => {
      // 1. Create a pending booking
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Aarav Sharma',
        email: 'aarav@example.com',
        phone: '+91 98765 43210',
        travelerCount: 2,
        travelDate: '2027-04-15',
        status: 'Pending',
        totalPrice: 25998,
      });

      expect(created.status).toBe('Pending');

      // 2. Agent confirms the booking
      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Confirmed', agentUser);

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.booking.status).toBe('Confirmed');
      expect(result.body.message).toContain('successfully confirmed');

      // 3. Verify directly from database
      const persisted = getBookingByReference(db, created.bookingReference);
      expect(persisted).toBeDefined();
      expect(persisted.status).toBe('Confirmed');
    });

    it('case-insensitively accepts target status (e.g. "confirmed" -> "Confirmed")', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Meera Iyer',
        email: 'meera@example.com',
        phone: '+91 98765 43211',
        travelerCount: 1,
        travelDate: '2027-05-20',
        status: 'Pending',
        totalPrice: 12999,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'confirmed', agentUser);
      expect(result.status).toBe(200);
      expect(result.body.booking.status).toBe('Confirmed');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Successful Rejection & Database Persistence (Requirements 2, 3, 6)
  // ---------------------------------------------------------------------------
  describe('2. Rejection of Pending Bookings', () => {
    it('successfully rejects a pending booking and persists the status in the database', () => {
      const created = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Priya Patel',
        email: 'priya@example.com',
        phone: '+91 98123 45678',
        travelerCount: 1,
        travelDate: '2027-06-10',
        status: 'Pending',
        totalPrice: 18499,
      });

      expect(created.status).toBe('Pending');

      // Agent rejects the booking
      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Rejected', agentUser);

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.booking.status).toBe('Rejected');
      expect(result.body.message).toContain('successfully rejected');

      // Verify directly from database
      const persisted = getBookingByReference(db, created.bookingReference);
      expect(persisted).toBeDefined();
      expect(persisted.status).toBe('Rejected');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Business Rules & Invalid Transitions (Requirement 5)
  // ---------------------------------------------------------------------------
  describe('3. Business Rules & Transition Safeguards', () => {
    it('prevents already Confirmed bookings from being confirmed again (409 Conflict)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Karan Mehra',
        email: 'karan@example.com',
        phone: '+91 98765 00001',
        travelerCount: 2,
        travelDate: '2027-04-15',
        status: 'Confirmed',
        totalPrice: 25998,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Confirmed', agentUser);
      expect(result.status).toBe(409);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('already Confirmed');
    });

    it('prevents already Confirmed bookings from being rejected (409 Conflict)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Karan Mehra',
        email: 'karan@example.com',
        phone: '+91 98765 00001',
        travelerCount: 2,
        travelDate: '2027-04-15',
        status: 'Confirmed',
        totalPrice: 25998,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Rejected', agentUser);
      expect(result.status).toBe(409);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('already Confirmed');
    });

    it('prevents already Rejected bookings from being rejected again (409 Conflict)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Sneha Roy',
        email: 'sneha@example.com',
        phone: '+91 98765 00002',
        travelerCount: 1,
        travelDate: '2027-05-15',
        status: 'Rejected',
        totalPrice: 18499,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Rejected', agentUser);
      expect(result.status).toBe(409);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('already Rejected');
    });

    it('prevents already Rejected bookings from being confirmed (409 Conflict)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Sneha Roy',
        email: 'sneha@example.com',
        phone: '+91 98765 00002',
        travelerCount: 1,
        travelDate: '2027-05-15',
        status: 'Rejected',
        totalPrice: 18499,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Confirmed', agentUser);
      expect(result.status).toBe(409);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('already Rejected');
    });

    it('rejects invalid or unsupported target statuses (400 Bad Request)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Arjun Das',
        email: 'arjun@example.com',
        phone: '+91 98765 00003',
        travelerCount: 2,
        travelDate: '2027-05-01',
        status: 'Pending',
        totalPrice: 25998,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Cancelled', agentUser);
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain("Permitted values are 'Confirmed' or 'Rejected'");
    });

    it('verifies ALLOWED_STATUS_TRANSITIONS specification matches business rules', () => {
      expect(ALLOWED_STATUS_TRANSITIONS.Pending).toEqual(['Confirmed', 'Rejected']);
      expect(ALLOWED_STATUS_TRANSITIONS.Confirmed).toEqual([]);
      expect(ALLOWED_STATUS_TRANSITIONS.Rejected).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Agent Authorization Enforcement (Requirement 4)
  // ---------------------------------------------------------------------------
  describe('4. Agent Authorization Enforcement', () => {
    it('denies status transition if user role is not agent (403 Forbidden)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Tara Sen',
        email: 'tara@example.com',
        phone: '+91 98765 00004',
        travelerCount: 1,
        travelDate: '2027-06-01',
        status: 'Pending',
        totalPrice: 12999,
      });

      // Attempt status update as customer
      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Confirmed', customerUser);
      expect(result.status).toBe(403);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('Agent authorization required');
    });

    it('denies status transition if no authenticated agent object is provided (403 Forbidden)', () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Tara Sen',
        email: 'tara@example.com',
        phone: '+91 98765 00004',
        travelerCount: 1,
        travelDate: '2027-06-01',
        status: 'Pending',
        totalPrice: 12999,
      });

      const result = handleUpdateBookingStatus(db, created.bookingReference, 'Confirmed', null);
      expect(result.status).toBe(403);
      expect(result.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Nonexistent Bookings & Graceful Error Handling (Requirement 10)
  // ---------------------------------------------------------------------------
  describe('5. Nonexistent Bookings and Error Handling', () => {
    it('returns 404 Not Found for non-existent booking references', () => {
      const result = handleUpdateBookingStatus(db, 'BK-NONEXISTENT-9999', 'Confirmed', agentUser);
      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toContain('was not found');
    });

    it('returns 400 Bad Request for empty or missing booking reference', () => {
      const result = handleUpdateBookingStatus(db, '', 'Confirmed', agentUser);
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
    });

    it('returns 400 Bad Request for empty or missing target status', () => {
      const result = handleUpdateBookingStatus(db, 'BK-20261025-ABCD', '', agentUser);
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. HTTP API Endpoints & Request Dispatcher (Requirements 3 & 4)
  // ---------------------------------------------------------------------------
  describe('6. HTTP API Endpoints Integration', () => {
    it('updates status via PATCH /api/agent/bookings/:reference/status with agent token', async () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Vijay Kumar',
        email: 'vijay@example.com',
        phone: '+91 98765 11111',
        travelerCount: 2,
        travelDate: '2027-07-01',
        status: 'Pending',
        totalPrice: 25998,
      });

      const agentToken = createAgentToken(agentUser);
      let responseBody = null;
      let responseStatus = null;

      const req = {
        method: 'PATCH',
        url: `/api/agent/bookings/${created.bookingReference}/status`,
        headers: {
          authorization: `Bearer ${agentToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'Confirmed' }),
      };

      const res = {
        writeHead: (status) => {
          responseStatus = status;
        },
        end: (payload) => {
          responseBody = JSON.parse(payload);
        },
      };

      await handleApiRequest(req, res, db);

      expect(responseStatus).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.booking.status).toBe('Confirmed');

      // Verify database updated
      const inDb = getBookingByReference(db, created.bookingReference);
      expect(inDb.status).toBe('Confirmed');
    });

    it('confirms booking via POST /api/agent/bookings/:reference/confirm', async () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Anita Roy',
        email: 'anita@example.com',
        phone: '+91 98765 22222',
        travelerCount: 1,
        travelDate: '2027-08-01',
        status: 'Pending',
        totalPrice: 12999,
      });

      const agentToken = createAgentToken(agentUser);
      let responseBody = null;
      let responseStatus = null;

      const req = {
        method: 'POST',
        url: `/api/agent/bookings/${created.bookingReference}/confirm`,
        headers: {
          authorization: `Bearer ${agentToken}`,
        },
      };

      const res = {
        writeHead: (status) => {
          responseStatus = status;
        },
        end: (payload) => {
          responseBody = JSON.parse(payload);
        },
      };

      await handleApiRequest(req, res, db);

      expect(responseStatus).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.booking.status).toBe('Confirmed');
    });

    it('rejects booking via POST /api/agent/bookings/:reference/reject', async () => {
      const created = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Deepak Joshi',
        email: 'deepak@example.com',
        phone: '+91 98765 33333',
        travelerCount: 3,
        travelDate: '2027-09-01',
        status: 'Pending',
        totalPrice: 55497,
      });

      const agentToken = createAgentToken(agentUser);
      let responseBody = null;
      let responseStatus = null;

      const req = {
        method: 'POST',
        url: `/api/agent/bookings/${created.bookingReference}/reject`,
        headers: {
          authorization: `Bearer ${agentToken}`,
        },
      };

      const res = {
        writeHead: (status) => {
          responseStatus = status;
        },
        end: (payload) => {
          responseBody = JSON.parse(payload);
        },
      };

      await handleApiRequest(req, res, db);

      expect(responseStatus).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.booking.status).toBe('Rejected');
    });

    it('rejects customer token attempting to update status (403 Forbidden)', async () => {
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Hacker User',
        email: 'hacker@example.com',
        phone: '+91 98765 44444',
        travelerCount: 1,
        travelDate: '2027-07-15',
        status: 'Pending',
        totalPrice: 12999,
      });

      const customerToken = createCustomerToken({
        email: 'hacker@example.com',
        fullName: 'Hacker User',
      });

      let responseStatus = null;
      let responseBody = null;

      const req = {
        method: 'POST',
        url: `/api/agent/bookings/${created.bookingReference}/confirm`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      };

      const res = {
        writeHead: (status) => {
          responseStatus = status;
        },
        end: (payload) => {
          responseBody = JSON.parse(payload);
        },
      };

      await handleApiRequest(req, res, db);

      expect(responseStatus).toBe(403);
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toContain('Access denied');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Customer Visibility: Customer Sees Updated Status (Requirement 8)
  // ---------------------------------------------------------------------------
  describe('7. Customer Visibility of Updated Status', () => {
    it('ensures customer booking queries return the updated status after agent confirmation', async () => {
      // 1. Customer creates a booking
      const booking = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Customer Rohit',
        email: 'rohit@example.com',
        phone: '+91 98765 55555',
        travelerCount: 2,
        travelDate: '2027-05-15',
        status: 'Pending',
        totalPrice: 25998,
      });

      // 2. Agent confirms the booking in database
      const confirmResult = handleUpdateBookingStatus(db, booking.bookingReference, 'Confirmed', agentUser);
      expect(confirmResult.status).toBe(200);

      // 3. Customer fetches their bookings via authenticated API
      const customerToken = createCustomerToken({
        email: 'rohit@example.com',
        fullName: 'Customer Rohit',
      });

      let customerResponse = null;
      const customerReq = {
        method: 'GET',
        url: '/api/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      };

      const res = {
        writeHead: vi.fn(),
        end: (payload) => {
          customerResponse = JSON.parse(payload);
        },
      };

      await handleApiRequest(customerReq, res, db);

      expect(customerResponse.success).toBe(true);
      expect(customerResponse.bookings).toHaveLength(1);
      expect(customerResponse.bookings[0].bookingReference).toBe(booking.bookingReference);
      expect(customerResponse.bookings[0].status).toBe('Confirmed');
    });

    it('ensures customer booking queries return the updated status after agent rejection', async () => {
      const booking = createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Customer Pooja',
        email: 'pooja@example.com',
        phone: '+91 98765 66666',
        travelerCount: 1,
        travelDate: '2027-06-15',
        status: 'Pending',
        totalPrice: 18499,
      });

      // Agent rejects booking
      handleUpdateBookingStatus(db, booking.bookingReference, 'Rejected', agentUser);

      // Customer fetches their bookings
      const customerToken = createCustomerToken({
        email: 'pooja@example.com',
        fullName: 'Customer Pooja',
      });

      let customerResponse = null;
      const customerReq = {
        method: 'GET',
        url: '/api/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      };

      const res = {
        writeHead: vi.fn(),
        end: (payload) => {
          customerResponse = JSON.parse(payload);
        },
      };

      await handleApiRequest(customerReq, res, db);

      expect(customerResponse.success).toBe(true);
      expect(customerResponse.bookings[0].status).toBe('Rejected');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Frontend Agent Dashboard Actions UI (Requirements 2, 7, 9)
  // ---------------------------------------------------------------------------
  describe('8. Frontend Agent Dashboard Review Actions UI', () => {
    const mockBookings = [
      {
        id: 1,
        bookingReference: 'BK-20261025-PEND',
        packageTitle: 'Goa Coastal Escape',
        fullName: 'Pending Traveler',
        email: 'pending@example.com',
        phone: '+91 98765 11111',
        travelerCount: 2,
        travelDate: '2027-04-15',
        status: 'Pending',
        totalPrice: 25998,
        formattedTotal: '₹25,998',
        createdAt: '2026-10-25T10:00:00.000Z',
      },
      {
        id: 2,
        bookingReference: 'BK-20261025-CONF',
        packageTitle: 'Manali Snow Escape',
        fullName: 'Confirmed Traveler',
        email: 'confirmed@example.com',
        phone: '+91 98765 22222',
        travelerCount: 1,
        travelDate: '2027-05-10',
        status: 'Confirmed',
        totalPrice: 18499,
        formattedTotal: '₹18,499',
        createdAt: '2026-10-25T11:00:00.000Z',
      },
      {
        id: 3,
        bookingReference: 'BK-20261025-REJC',
        packageTitle: 'Jaipur Heritage Tour',
        fullName: 'Rejected Traveler',
        email: 'rejected@example.com',
        phone: '+91 98765 33333',
        travelerCount: 3,
        travelDate: '2027-06-01',
        status: 'Rejected',
        totalPrice: 38997,
        formattedTotal: '₹38,997',
        createdAt: '2026-10-25T12:00:00.000Z',
      },
    ];

    it('renders Confirm and Reject action buttons for Pending bookings in table view', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: mockBookings,
          agentToken: 'mock-agent-token',
          agentInfo: agentUser,
          initialViewMode: 'table',
        })
      );

      expect(html).toContain('data-testid="btn-confirm-booking"');
      expect(html).toContain('data-testid="btn-reject-booking"');
      expect(html).toContain('Confirm');
      expect(html).toContain('Reject');
      expect(html).toContain('data-testid="booking-processed-indicator"');
      expect(html).toContain('✓ Processed');
      expect(html).toContain('✕ Processed');
    });

    it('renders Confirm and Reject action buttons for Pending bookings in card view', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: mockBookings,
          agentToken: 'mock-agent-token',
          agentInfo: agentUser,
          initialViewMode: 'card',
        })
      );

      expect(html).toContain('data-testid="booking-actions-card"');
      expect(html).toContain('Confirm Booking');
      expect(html).toContain('Reject Booking');
    });
  });
});
