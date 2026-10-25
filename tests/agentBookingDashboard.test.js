import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentBookingDashboard from '../src/components/AgentBookingDashboard.jsx';
import App from '../src/App.jsx';
import Navbar from '../src/components/Navbar.jsx';
import Footer from '../src/components/Footer.jsx';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { createBooking } from '../src/server/models/bookingModel.js';
import { createUser } from '../src/server/models/userModel.js';
import { createAgentToken, createCustomerToken } from '../src/server/auth.js';
import { handleApiRequest } from '../src/server/apiHandler.js';
import { handleAgentLogin, handleGetAgentBookings } from '../src/server/controllers/bookingController.js';

describe('TAMS-39: Agent Booking Dashboard Interface & Verification', () => {
  const sampleBookings = [
    {
      id: 1,
      bookingReference: 'BK-20261025-7A3B',
      packageId: 'pkg-1',
      packageTitle: 'Coastal Escape',
      packageDestination: 'Goa, India',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-04-15',
      additionalRequests: 'Window seat preference',
      status: 'Pending',
      totalPrice: 25998,
      formattedTotal: '₹25,998',
      createdAt: '2026-10-25T10:00:00.000Z',
    },
    {
      id: 2,
      bookingReference: 'BK-20261024-9C2D',
      packageId: 'pkg-2',
      packageTitle: 'Himalayan Retreat',
      packageDestination: 'Manali, Himachal Pradesh',
      fullName: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+91 98123 45678',
      travelerCount: 1,
      travelDate: '2027-05-10',
      additionalRequests: 'Vegetarian breakfast',
      status: 'Confirmed',
      totalPrice: 18499,
      formattedTotal: '₹18,499',
      createdAt: '2026-10-24T14:30:00.000Z',
    },
    {
      id: 3,
      bookingReference: 'BK-20261023-1F4E',
      packageId: 'pkg-3',
      packageTitle: 'Golden Triangle Cultural Expedition',
      packageDestination: 'Delhi - Agra - Jaipur',
      fullName: 'Vikram Malhotra',
      email: 'vikram.m@example.com',
      phone: '+91 98711 22334',
      travelerCount: 4,
      travelDate: '2027-06-01',
      additionalRequests: 'Airport transfer required',
      status: 'Rejected',
      totalPrice: 119996,
      formattedTotal: '₹1,19,996',
      createdAt: '2026-10-23T09:15:00.000Z',
    },
  ];

  const mockAgentInfo = {
    email: 'agent@voyara.com',
    fullName: 'Voyara Travel Agent',
    role: 'agent',
  };

  // ---------------------------------------------------------------------------
  // 1. Data Model & Field Requirements (Requirement 3)
  // ---------------------------------------------------------------------------
  describe('1. Data Model and Required Booking Field Display', () => {
    it('displays all required booking fields in table layout', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialViewMode: 'table',
        })
      );

      // 1. Booking reference
      expect(html).toContain('BK-20261025-7A3B');
      expect(html).toContain('BK-20261024-9C2D');
      expect(html).toContain('BK-20261023-1F4E');

      // 2. Customer name
      expect(html).toContain('Aarav Sharma');
      expect(html).toContain('Priya Patel');
      expect(html).toContain('Vikram Malhotra');

      // 3. Customer contact details (Email and Phone)
      expect(html).toContain('aarav.sharma@example.com');
      expect(html).toContain('+91 98765 43210');
      expect(html).toContain('priya.patel@example.com');
      expect(html).toContain('+91 98123 45678');
      expect(html).toContain('vikram.m@example.com');
      expect(html).toContain('+91 98711 22334');

      // 4. Travel package name
      expect(html).toContain('Coastal Escape');
      expect(html).toContain('Himalayan Retreat');
      expect(html).toContain('Golden Triangle Cultural Expedition');

      // 5. Booking date and travel dates
      expect(html).toContain('Apr 15, 2027');
      expect(html).toContain('May 10, 2027');
      expect(html).toContain('Jun 1, 2027');

      // 6. Traveler count
      expect(html).toContain('2 Travelers');
      expect(html).toContain('1 Traveler');
      expect(html).toContain('4 Travelers');

      // 7. Statuses
      expect(html).toContain('Pending');
      expect(html).toContain('Confirmed');
      expect(html).toContain('Rejected');
    });

    it('displays all required booking fields in card layout', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialViewMode: 'card',
        })
      );

      expect(html).toContain('data-testid="agent-bookings-card-container"');
      expect(html).toContain('BK-20261025-7A3B');
      expect(html).toContain('Aarav Sharma');
      expect(html).toContain('aarav.sharma@example.com');
      expect(html).toContain('+91 98765 43210');
      expect(html).toContain('Coastal Escape');
      expect(html).toContain('Pending');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Status Indicators & Counts (Requirement 5)
  // ---------------------------------------------------------------------------
  describe('2. Status Indicators & Metric Counts', () => {
    it('applies dedicated status indicator classes for Pending, Confirmed, and Rejected', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialViewMode: 'table',
        })
      );

      expect(html).toContain('status-pending');
      expect(html).toContain('status-confirmed');
      expect(html).toContain('status-rejected');
    });

    it('renders accurate metric summary cards for Total, Pending, Confirmed, and Rejected', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      // Total: 3
      expect(html).toContain('data-testid="stat-total-bookings"');
      expect(html).toContain('>3<');

      // Pending: 1
      expect(html).toContain('data-testid="stat-pending-bookings"');
      expect(html).toContain('>1<');

      // Confirmed: 1
      expect(html).toContain('data-testid="stat-confirmed-bookings"');

      // Rejected: 1
      expect(html).toContain('data-testid="stat-rejected-bookings"');
    });

    it('filters displayed bookings when initialStatusFilter is set', () => {
      const pendingOnlyHtml = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialStatusFilter: 'Pending',
        })
      );

      expect(pendingOnlyHtml).toContain('Aarav Sharma');
      expect(pendingOnlyHtml).not.toContain('Priya Patel');
      expect(pendingOnlyHtml).not.toContain('Vikram Malhotra');

      const confirmedOnlyHtml = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialStatusFilter: 'Confirmed',
        })
      );

      expect(confirmedOnlyHtml).toContain('Priya Patel');
      expect(confirmedOnlyHtml).not.toContain('Aarav Sharma');
      expect(confirmedOnlyHtml).not.toContain('Vikram Malhotra');
    });

    it('filters displayed bookings by search query across customer name, email, or reference', () => {
      const searchHtml = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialSearchQuery: 'BK-20261024-9C2D',
        })
      );

      expect(searchHtml).toContain('BK-20261024-9C2D');
      expect(searchHtml).toContain('Priya Patel');
      expect(searchHtml).not.toContain('Aarav Sharma');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Loading, Empty, and Error States (Requirement 6)
  // ---------------------------------------------------------------------------
  describe('3. Loading, Empty, and Error States', () => {
    it('renders accessible loading state when isLoading is true', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          isLoading: true,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      expect(html).toContain('data-testid="agent-loading-state"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Loading Customer Booking Requests...');
    });

    it('renders empty state when there are no bookings in the database', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: [],
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      expect(html).toContain('data-testid="agent-empty-state"');
      expect(html).toContain('No customer booking requests found');
    });

    it('renders filtered empty state when search filters result in 0 matches', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
          initialSearchQuery: 'NonExistentQuery999',
        })
      );

      expect(html).toContain('data-testid="agent-filtered-empty-state"');
      expect(html).toContain('No bookings match your filter criteria');
      expect(html).toContain('Reset Filters');
    });

    it('renders error state with retry option when error is provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          error: 'Network timeout connecting to server',
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      expect(html).toContain('data-testid="agent-error-state"');
      expect(html).toContain('Network timeout connecting to server');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Agent Access Flow & Security (Requirement 9 & 10)
  // ---------------------------------------------------------------------------
  describe('4. Agent Access Flow and Authentication Gate', () => {
    it('renders agent authentication gate when unauthenticated', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard)
      );

      expect(html).toContain('data-testid="agent-auth-gate"');
      expect(html).toContain('Agent Portal Access');
      expect(html).toContain('Authorized Personnel Only');
      expect(html).toContain('id="agent-login-email"');
      expect(html).toContain('id="agent-login-password"');
      expect(html).toContain('id="agent-login-submit"');
    });

    it('displays agent profile chip when authenticated', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      expect(html).toContain('data-testid="agent-profile-info"');
      expect(html).toContain('Voyara Travel Agent');
      expect(html).toContain('agent@voyara.com');
      expect(html).toContain('id="agent-logout-btn"');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Real Backend Integration (Requirement 7)
  // ---------------------------------------------------------------------------
  describe('5. Real Backend Integration and SQLite Persistence', () => {
    let db;

    beforeEach(() => {
      db = getDatabase({ memory: true });
      runMigrations(db);

      // Seed test bookings across multiple customers
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98765 43210',
        travelerCount: 2,
        travelDate: '2027-04-15',
        status: 'Pending',
        totalPrice: 25998,
      });

      createBooking(db, {
        packageId: 'pkg-2',
        fullName: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '+91 98123 45678',
        travelerCount: 1,
        travelDate: '2027-05-10',
        status: 'Confirmed',
        totalPrice: 18499,
      });

      createBooking(db, {
        packageId: 'pkg-3',
        fullName: 'Vikram Malhotra',
        email: 'vikram.m@example.com',
        phone: '+91 98711 22334',
        travelerCount: 3,
        travelDate: '2027-06-01',
        status: 'Rejected',
        totalPrice: 89997,
      });
    });

    afterEach(() => {
      closeDatabase(db);
    });

    it('authenticates valid agent and rejects invalid agent credentials', () => {
      // 1. Valid agent credentials
      const validLogin = handleAgentLogin(db, {
        email: 'agent@voyara.com',
        password: 'agent123',
      });

      expect(validLogin.status).toBe(200);
      expect(validLogin.body.success).toBe(true);
      expect(validLogin.body.token).toBeDefined();
      expect(validLogin.body.agent.role).toBe('agent');

      // 2. Invalid password
      const badPassword = handleAgentLogin(db, {
        email: 'agent@voyara.com',
        password: 'wrongpassword',
      });
      expect(badPassword.status).toBe(401);
      expect(badPassword.body.success).toBe(false);

      // 3. Customer attempting agent login
      createUser(db, {
        email: 'customer@example.com',
        password: 'voyara123',
        fullName: 'Regular Customer',
        role: 'customer',
      });
      const customerAsAgent = handleAgentLogin(db, {
        email: 'customer@example.com',
        password: 'voyara123',
      });
      expect(customerAsAgent.status).toBe(403);
      expect(customerAsAgent.body.message).toContain('Access denied');
    });

    it('returns all customer booking records for authenticated agent', () => {
      const agentResult = handleGetAgentBookings(db, {
        email: 'agent@voyara.com',
        fullName: 'Voyara Travel Agent',
        role: 'agent',
      });

      expect(agentResult.status).toBe(200);
      expect(agentResult.body.success).toBe(true);
      expect(agentResult.body.bookings.length).toBeGreaterThanOrEqual(3);

      const emails = agentResult.body.bookings.map((b) => b.email);
      expect(emails).toContain('aarav.sharma@example.com');
      expect(emails).toContain('priya.patel@example.com');
      expect(emails).toContain('vikram.m@example.com');
    });

    it('enforces agent authentication on GET /api/agent/bookings', async () => {
      // 1. Without token -> 401 Unauthorized
      let unauthResponse = null;
      const unauthReq = {
        method: 'GET',
        url: '/api/agent/bookings',
        headers: {},
      };
      const mockRes = {
        writeHead: vi.fn(),
        end: (body) => {
          unauthResponse = JSON.parse(body);
        },
      };

      await handleApiRequest(unauthReq, mockRes, db);
      expect(mockRes.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
      expect(unauthResponse.success).toBe(false);

      // 2. With Customer token -> 403 Forbidden
      const customerToken = createCustomerToken({
        email: 'customer@example.com',
        fullName: 'Customer User',
      });

      let forbiddenResponse = null;
      const forbiddenReq = {
        method: 'GET',
        url: '/api/agent/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      };
      const mockRes2 = {
        writeHead: vi.fn(),
        end: (body) => {
          forbiddenResponse = JSON.parse(body);
        },
      };

      await handleApiRequest(forbiddenReq, mockRes2, db);
      expect(mockRes2.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
      expect(forbiddenResponse.success).toBe(false);

      // 3. With Agent token -> 200 OK
      const agentToken = createAgentToken({
        email: 'agent@voyara.com',
        fullName: 'Voyara Travel Agent',
      });

      let agentResponse = null;
      const agentReq = {
        method: 'GET',
        url: '/api/agent/bookings',
        headers: {
          authorization: `Bearer ${agentToken}`,
        },
      };
      const mockRes3 = {
        writeHead: vi.fn(),
        end: (body) => {
          agentResponse = JSON.parse(body);
        },
      };

      await handleApiRequest(agentReq, mockRes3, db);
      expect(mockRes3.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      expect(agentResponse.success).toBe(true);
      expect(Array.isArray(agentResponse.bookings)).toBe(true);
      expect(agentResponse.bookings.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Application Routing & Navigation (Requirement 8)
  // ---------------------------------------------------------------------------
  describe('6. Application Routing and Navbar/Footer Integration', () => {
    it('renders AgentBookingDashboard when App initialView is "agent"', () => {
      const html = renderToStaticMarkup(
        React.createElement(App, { initialView: 'agent' })
      );

      expect(html).toContain('data-testid="agent-booking-dashboard"');
      expect(html).toContain('Agent Portal Access');
    });

    it('includes accessible Agent Portal link in Navbar', () => {
      const html = renderToStaticMarkup(
        React.createElement(Navbar, { activeView: 'agent' })
      );

      expect(html).toContain('id="nav-agent-dashboard"');
      expect(html).toContain('Agent Portal');
      expect(html).toContain('href="#agent-dashboard"');
    });

    it('includes accessible Agent Portal link in Footer', () => {
      const html = renderToStaticMarkup(
        React.createElement(Footer)
      );

      expect(html).toContain('id="footer-agent-dashboard"');
      expect(html).toContain('Agent Portal');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Booking Review Actions (TAMS-40)
  // ---------------------------------------------------------------------------
  describe('7. Booking Review Actions (Confirm and Reject)', () => {
    it('renders Confirm and Reject action buttons for Pending bookings and processed indicators for completed bookings', () => {
      const html = renderToStaticMarkup(
        React.createElement(AgentBookingDashboard, {
          bookings: sampleBookings,
          agentToken: 'mock-agent-token',
          agentInfo: mockAgentInfo,
        })
      );

      expect(html).toContain('data-testid="btn-confirm-booking"');
      expect(html).toContain('data-testid="btn-reject-booking"');
      expect(html).toContain('Confirm');
      expect(html).toContain('Reject');
      expect(html).toContain('data-testid="booking-processed-indicator"');
    });
  });
});
