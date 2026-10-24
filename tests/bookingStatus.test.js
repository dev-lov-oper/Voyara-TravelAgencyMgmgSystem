import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BookingStatus from '../src/components/BookingStatus.jsx';
import App from '../src/App.jsx';
import Navbar from '../src/components/Navbar.jsx';
import { formatBookingDate, getStatusClass } from '../src/utils/bookingStatusUtils.js';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { createBooking } from '../src/server/models/bookingModel.js';
import { handleApiRequest } from '../src/server/apiHandler.js';
import { getAllBookings, getBookingByReference, BookingApiError } from '../src/services/bookingService.js';
import { createCustomerToken } from '../src/server/auth.js';


describe('TAMS-36: Booking Status Interface & Data Model Validation', () => {
  const sampleBookings = [
    {
      id: 1,
      bookingReference: 'BK-20261022-7A3B',
      packageId: 'pkg-1',
      packageTitle: 'Coastal Escape',
      packageDestination: 'Goa, India',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-04-15',
      additionalRequests: 'Require airport shuttle pickup',
      status: 'Pending',
      totalPrice: 25998,
      formattedTotal: '₹25,998',
      createdAt: '2026-10-22T10:00:00.000Z',
    },
    {
      id: 2,
      bookingReference: 'BK-20261020-9C2D',
      packageId: 'pkg-2',
      packageTitle: 'Himalayan Retreat',
      packageDestination: 'Manali, Himachal Pradesh',
      fullName: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+91 98123 45678',
      travelerCount: 1,
      travelDate: '2027-05-10',
      additionalRequests: 'Vegetarian breakfast preference',
      status: 'Confirmed',
      totalPrice: 18499,
      formattedTotal: '₹18,499',
      createdAt: '2026-10-20T14:30:00.000Z',
    },
    {
      id: 3,
      bookingReference: 'BK-20261018-4E1F',
      packageId: 'pkg-3',
      packageTitle: 'Royal Rajasthan Heritage Tour',
      packageDestination: 'Jaipur, Rajasthan',
      fullName: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      phone: '+91 98234 56789',
      travelerCount: 4,
      travelDate: '2027-06-01',
      additionalRequests: 'Interconnecting rooms',
      status: 'Rejected',
      totalPrice: 87996,
      formattedTotal: '₹87,996',
      createdAt: '2026-10-18T09:15:00.000Z',
    },
  ];

  describe('1. Required Fields Display (Reference, Package Name, Booking Date, Travelers, Status)', () => {
    it('renders the booking reference code accurately for every booking record', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('BK-20261022-7A3B');
      expect(html).toContain('BK-20261020-9C2D');
      expect(html).toContain('BK-20261018-4E1F');
      expect(html).toContain('data-testid="booking-reference"');
    });

    it('renders the travel package name accurately', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('Coastal Escape');
      expect(html).toContain('Himalayan Retreat');
      expect(html).toContain('Royal Rajasthan Heritage Tour');
    });

    it('renders the booking date formatted nicely from the model createdAt timestamp', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('Booking Date');
      expect(html).toContain(formatBookingDate('2026-10-22T10:00:00.000Z'));
      expect(html).toContain(formatBookingDate('2026-10-20T14:30:00.000Z'));
      expect(html).toContain(formatBookingDate('2026-10-18T09:15:00.000Z'));
    });

    it('renders the scheduled travel date from the data model', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('Travel Date');
      expect(html).toContain('2027-04-15');
      expect(html).toContain('2027-05-10');
      expect(html).toContain('2027-06-01');
    });

    it('renders number of travelers with correct singular/plural grammar', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      // 2 travelers (plural)
      expect(html).toContain('2 Travelers');
      // 1 traveler (singular)
      expect(html).toContain('1 Traveler');
      // 4 travelers (plural)
      expect(html).toContain('4 Travelers');
    });

    it('renders additional supported data model fields (traveler name, formatted price, destination)', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('Aarav Sharma');
      expect(html).toContain('Priya Patel');
      expect(html).toContain('Vikram Singh');
      expect(html).toContain('₹25,998');
      expect(html).toContain('₹18,499');
      expect(html).toContain('₹87,996');
      expect(html).toContain('Goa, India');
      expect(html).toContain('Manali, Himachal Pradesh');
      expect(html).toContain('Jaipur, Rajasthan');
    });

    it('renders special requests when present in the booking record', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('Require airport shuttle pickup');
      expect(html).toContain('Vegetarian breakfast preference');
      expect(html).toContain('Interconnecting rooms');
    });
  });

  describe('2. Status Labels & Styling (Pending, Confirmed, Rejected)', () => {
    it('displays clear "Pending" status label with .status-pending pill class', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: [sampleBookings[0]] })
      );

      expect(html).toContain('id="status-badge-BK-20261022-7A3B"');
      expect(html).toContain('status-pending');
      expect(html).toContain('Pending');
      expect(html).toContain('Awaiting travel specialist itinerary review');
    });

    it('displays clear "Confirmed" status label with .status-confirmed pill class', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: [sampleBookings[1]] })
      );

      expect(html).toContain('id="status-badge-BK-20261020-9C2D"');
      expect(html).toContain('status-confirmed');
      expect(html).toContain('Confirmed');
      expect(html).toContain('Reservation confirmed');
    });

    it('displays clear "Rejected" status label with .status-rejected pill class', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: [sampleBookings[2]] })
      );

      expect(html).toContain('id="status-badge-BK-20261018-4E1F"');
      expect(html).toContain('status-rejected');
      expect(html).toContain('Rejected');
      expect(html).toContain('Reservation request could not be fulfilled');
    });

    it('getStatusClass correctly maps status strings in case-insensitive manner', () => {
      expect(getStatusClass('Pending')).toBe('status-pending');
      expect(getStatusClass('pending')).toBe('status-pending');
      expect(getStatusClass('Confirmed')).toBe('status-confirmed');
      expect(getStatusClass('CONFIRMED')).toBe('status-confirmed');
      expect(getStatusClass('Rejected')).toBe('status-rejected');
      expect(getStatusClass('rejected')).toBe('status-rejected');
      expect(getStatusClass('Cancelled')).toBe('status-cancelled');
      expect(getStatusClass('unknown')).toBe('status-pending');
    });
  });

  describe('3. Loading, Empty-Bookings, and Error States', () => {
    it('renders accessible loading skeleton when isLoading is true', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: [],
          isLoading: true,
        })
      );

      expect(html).toContain('id="bookings-loading-state"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-label="Loading your bookings"');
      expect(html).toContain('skeleton-card');
      expect(html).not.toContain('id="bookings-empty-state"');
      expect(html).not.toContain('id="bookings-error-state"');
    });

    it('renders empty-bookings state when bookings list is empty and not loading', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: [],
          isLoading: false,
          error: null,
        })
      );

      expect(html).toContain('id="bookings-empty-state"');
      expect(html).toContain('No bookings found');
      expect(html).toContain('Explore Packages');
      expect(html).not.toContain('id="bookings-loading-state"');
      expect(html).not.toContain('id="bookings-error-state"');
    });

    it('renders error state when an error occurs during booking retrieval', () => {
      const errorMessage = 'Failed to connect to the Voyara booking database (HTTP 500)';
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: [],
          isLoading: false,
          error: errorMessage,
        })
      );

      expect(html).toContain('id="bookings-error-state"');
      expect(html).toContain('error-state-card');
      expect(html).toContain(errorMessage);
      expect(html).toContain('Try Again');
      expect(html).not.toContain('id="bookings-empty-state"');
    });

    it('renders filter empty state when searching/filtering produces 0 matches from existing bookings', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          initialSearchQuery: 'NonExistentDestination999',
          isLoading: false,
        })
      );

      expect(html).toContain('id="bookings-filter-empty-state"');
      expect(html).toContain('No matching bookings found');
      expect(html).toContain('Reset Filters');
      expect(html).not.toContain('Coastal Escape');
    });
  });

  describe('4. Search and Status Filtering Functionality', () => {
    it('filters bookings by reference code query', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          initialSearchQuery: 'BK-20261022-7A3B',
        })
      );

      expect(html).toContain('BK-20261022-7A3B');
      expect(html).toContain('Coastal Escape');
      expect(html).not.toContain('BK-20261020-9C2D');
      expect(html).not.toContain('Himalayan Retreat');
    });

    it('filters bookings by package title query', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          initialSearchQuery: 'Himalayan',
        })
      );

      expect(html).toContain('Himalayan Retreat');
      expect(html).toContain('BK-20261020-9C2D');
      expect(html).not.toContain('Coastal Escape');
      expect(html).not.toContain('Royal Rajasthan');
    });

    it('filters bookings by traveler name query', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          initialSearchQuery: 'Vikram',
        })
      );

      expect(html).toContain('Vikram Singh');
      expect(html).toContain('Royal Rajasthan Heritage Tour');
      expect(html).not.toContain('Aarav Sharma');
      expect(html).not.toContain('Priya Patel');
    });

    it('filters bookings by status pill selection ("Confirmed")', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, {
          bookings: sampleBookings,
          initialStatusFilter: 'Confirmed',
        })
      );

      expect(html).toContain('Himalayan Retreat');
      expect(html).not.toContain('Coastal Escape'); // Pending
      expect(html).not.toContain('Royal Rajasthan'); // Rejected
    });

    it('displays status counts accurately in toolbar pills', () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingStatus, { bookings: sampleBookings })
      );

      expect(html).toContain('All <span class="pill-count">(3)</span>');
      expect(html).toContain('Pending <span class="pill-count">(1)</span>');
      expect(html).toContain('Confirmed <span class="pill-count">(1)</span>');
      expect(html).toContain('Rejected <span class="pill-count">(1)</span>');
    });
  });

  describe('5. Architecture, Navigation & UI Theme Integration', () => {
    it('Navbar includes "My Bookings" link with proper accessibility attributes', () => {
      const html = renderToStaticMarkup(
        React.createElement(Navbar, { activeView: 'bookings' })
      );

      expect(html).toContain('id="nav-booking-status"');
      expect(html).toContain('My Bookings');
      expect(html).toContain('nav-link active');
      expect(html).toContain('id="mobile-nav-booking-status"');
    });

    it('App component renders BookingStatus when current view is set to bookings', () => {
      const html = renderToStaticMarkup(React.createElement(App, { initialView: 'bookings' }));

      expect(html).toContain('id="booking-status-heading"');
      expect(html).toContain('My Travel Bookings');
      expect(html).toContain('booking-status-page');
    });

    it('App component preserves default package listing view when no view param is present', () => {
      const html = renderToStaticMarkup(React.createElement(App));

      expect(html).toContain('packages-section');
      expect(html).toContain('Explore Travel Packages');
      expect(html).not.toContain('id="booking-status-heading"');
    });
  });



  describe('6. Real Backend Database & Service Contract Verification', () => {
    let db;

    beforeEach(() => {
      db = getDatabase({ memory: true });
      runMigrations(db);
    });

    afterEach(() => {
      closeDatabase(db);
    });

    it('persists and retrieves bookings from database conforming to existing API contract', () => {
      // 1. Create a booking in SQLite database
      const created = createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Backend Contract Traveler',
        email: 'backend.contract@voyara.test',
        phone: '+91 99887 76655',
        travelerCount: 3,
        travelDate: '2027-11-20',
        additionalRequests: 'Window seats on scenic bus tour',
        status: 'Pending',
        totalPrice: 38997,
      });

      expect(created.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
      expect(created.packageTitle).toBe('Coastal Escape');
      expect(created.status).toBe('Pending');
      expect(created.travelerCount).toBe(3);

      // 2. Query customer bookings via API handler with authorization token
      const token = createCustomerToken({ email: created.email, fullName: created.fullName });
      const mockReq = {
        method: 'GET',
        url: '/api/bookings',
        headers: {
          authorization: `Bearer ${token}`,
        },
        on: () => {},
      };

      let statusCode = null;
      let responseBody = '';
      const mockRes = {
        writeHead: (status) => {
          statusCode = status;
        },
        end: (data) => {
          responseBody = data;
        },
      };

      handleApiRequest(mockReq, mockRes, db);
      expect(statusCode).toBe(200);

      const parsed = JSON.parse(responseBody);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.bookings)).toBe(true);

      const found = parsed.bookings.find((b) => b.bookingReference === created.bookingReference);
      expect(found).toBeDefined();
      expect(found.packageTitle).toBe('Coastal Escape');
      expect(found.fullName).toBe('Backend Contract Traveler');
      expect(found.travelerCount).toBe(3);
      expect(found.status).toBe('Pending');
      expect(found.formattedTotal).toBe('₹38,997');
    });

    it('getAllBookings client service calls GET /api/bookings and parses response array', async () => {
      const mockBookings = [
        {
          id: 1,
          bookingReference: 'BK-TEST-1234',
          packageTitle: 'Manali Snow Trail',
          travelDate: '2027-02-15',
          travelerCount: 2,
          status: 'Confirmed',
        },
      ];

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, bookings: mockBookings }),
      });

      const result = await getAllBookings();
      expect(fetchSpy).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({ method: 'GET' }));
      expect(result.length).toBe(1);
      expect(result[0].bookingReference).toBe('BK-TEST-1234');
      expect(result[0].status).toBe('Confirmed');

      fetchSpy.mockRestore();
    });

    it('getAllBookings client service handles HTTP error responses cleanly with BookingApiError', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ success: false, message: 'Database connection failed.' }),
      });

      await expect(getAllBookings()).rejects.toThrow(BookingApiError);
      await expect(getAllBookings()).rejects.toThrow('Database connection failed.');

      fetchSpy.mockRestore();
    });

    it('getBookingByReference client service retrieves single booking record by reference', async () => {
      const mockSingle = {
        id: 2,
        bookingReference: 'BK-SINGLE-5678',
        packageTitle: 'Kerala Backwaters',
        status: 'Pending',
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, booking: mockSingle }),
      });

      const result = await getBookingByReference('BK-SINGLE-5678');
      expect(result.bookingReference).toBe('BK-SINGLE-5678');
      expect(result.packageTitle).toBe('Kerala Backwaters');

      fetchSpy.mockRestore();
    });
  });
});
