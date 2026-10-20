import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations, getAppliedMigrations } from '../src/server/db/migrations.js';
import { getAllPackages, getPackageById } from '../src/server/models/packageModel.js';
import {
  createBooking,
  getBookingByReference,
  getBookingById,
  getAllBookings,
  generateBookingReference,
} from '../src/server/models/bookingModel.js';
import {
  validateBookingPayload,
  handleCreateBooking,
  handleGetBookingByReference,
} from '../src/server/controllers/bookingController.js';
import { handleApiRequest } from '../src/server/apiHandler.js';
import BookingForm from '../src/components/BookingForm.jsx';
import { createBooking as clientCreateBooking } from '../src/services/bookingService.js';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';

describe('TAMS-34: Database Initialization & Migrations', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('1. Applies migrations and creates packages and bookings tables', () => {
    const applied = getAppliedMigrations(db);
    expect(applied.has('001_initial_schema.sql')).toBe(true);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('packages', 'bookings', 'migrations')")
      .all();
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('packages');
    expect(tableNames).toContain('bookings');
    expect(tableNames).toContain('migrations');
  });

  it('2. Seeds initial sample travel packages into the database catalog', () => {
    const packages = getAllPackages(db);
    expect(packages.length).toBeGreaterThanOrEqual(6);

    const goa = getPackageById(db, 'pkg-1');
    expect(goa).toBeDefined();
    expect(goa.title).toBe('Coastal Escape');
    expect(goa.destination).toBe('Goa');
    expect(goa.price).toBe(12999);
    expect(goa.isActive).toBe(true);
    expect(Array.isArray(goa.itinerary)).toBe(true);
  });

  it('3. Migrations are idempotent and do not duplicate tables or data upon re-execution', () => {
    const initialPackagesCount = getAllPackages(db).length;
    const secondRun = runMigrations(db);
    expect(secondRun.length).toBe(0); // No new migrations to apply
    expect(getAllPackages(db).length).toBe(initialPackagesCount);
  });

  it('4. Persists data on disk and remains available across database restarts', () => {
    const tempDbPath = path.resolve(process.cwd(), 'scratch', 'restart_test.db');
    const tempDir = path.dirname(tempDbPath);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Phase 1: Open file DB, run migration, save a booking
    let diskDb = getDatabase({ dbPath: tempDbPath });
    runMigrations(diskDb);

    const savedBooking = createBooking(diskDb, {
      packageId: 'pkg-1',
      fullName: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-05-15',
      additionalRequests: 'Window seat preference',
      status: 'Pending',
      totalPrice: 25998,
    });
    expect(savedBooking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
    closeDatabase(diskDb);

    // Phase 2: Simulate application restart by reopening the file database
    diskDb = getDatabase({ dbPath: tempDbPath });
    runMigrations(diskDb); // idempotent check

    const retrievedBooking = getBookingByReference(diskDb, savedBooking.bookingReference);
    expect(retrievedBooking).toBeDefined();
    expect(retrievedBooking.fullName).toBe('Aarav Sharma');
    expect(retrievedBooking.email).toBe('aarav@example.com');
    expect(retrievedBooking.totalPrice).toBe(25998);
    expect(retrievedBooking.status).toBe('Pending');
    expect(retrievedBooking.packageTitle).toBe('Coastal Escape');

    closeDatabase(diskDb);
    try {
      fs.rmSync(tempDbPath, { force: true });
    } catch {
      // Ignore cleanup error
    }
  });
});

describe('TAMS-34: Booking Reference Generation & Model Methods', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('1. Generates unique, human-readable booking reference formatted as BK-YYYYMMDD-XXXX', () => {
    const ref1 = generateBookingReference(new Date('2026-10-20T12:00:00Z'));
    const ref2 = generateBookingReference(new Date('2026-10-20T12:00:00Z'));

    expect(ref1).toMatch(/^BK-20261020-[A-Z0-9]{4}$/);
    expect(ref2).toMatch(/^BK-20261020-[A-Z0-9]{4}$/);
    expect(ref1).not.toBe(ref2); // Random suffix ensures uniqueness
  });

  it('2. Correctly persists booking details, associates travel package, and sets initial status to Pending', () => {
    const booking = createBooking(db, {
      packageId: 'pkg-2',
      fullName: 'Sneha Patel',
      email: 'sneha.patel@voyara.test',
      phone: '+91 91234 56789',
      travelerCount: 3,
      travelDate: '2027-04-20',
      additionalRequests: 'Vegetarian meals required',
      status: 'Pending',
      totalPrice: 55497,
    });

    expect(booking.id).toBeDefined();
    expect(booking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
    expect(booking.packageId).toBe('pkg-2');
    expect(booking.packageTitle).toBe('Himalayan Retreat');
    expect(booking.packageDestination).toBe('Manali');
    expect(booking.fullName).toBe('Sneha Patel');
    expect(booking.email).toBe('sneha.patel@voyara.test');
    expect(booking.phone).toBe('+91 91234 56789');
    expect(booking.travelerCount).toBe(3);
    expect(booking.travelDate).toBe('2027-04-20');
    expect(booking.additionalRequests).toBe('Vegetarian meals required');
    expect(booking.status).toBe('Pending');
    expect(booking.totalPrice).toBe(55497);
    expect(booking.formattedTotal).toBe('₹55,497');
    expect(booking.createdAt).toBeDefined();
  });

  it('3. Retrieves booking by ID and lists all bookings in descending chronological order', () => {
    const b1 = createBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Traveler One',
      email: 'one@example.com',
      phone: '9876543210',
      travelerCount: 1,
      travelDate: '2027-01-10',
      status: 'Pending',
      totalPrice: 12999,
    });

    const b2 = createBooking(db, {
      packageId: 'pkg-3',
      fullName: 'Traveler Two',
      email: 'two@example.com',
      phone: '9876543211',
      travelerCount: 2,
      travelDate: '2027-02-15',
      status: 'Pending',
      totalPrice: 17998,
    });

    const foundById = getBookingById(db, b1.id);
    expect(foundById.bookingReference).toBe(b1.bookingReference);

    const allBookings = getAllBookings(db);
    expect(allBookings.length).toBe(2);
    expect(allBookings[0].bookingReference).toBe(b2.bookingReference);
  });
});

describe('TAMS-34: Server-Side Validation Rules', () => {
  it('1. Rejects missing or empty required fields', () => {
    const emptyPayload = {};
    const errors = validateBookingPayload(emptyPayload);

    expect(errors.packageId).toBe('Package identifier is required.');
    expect(errors.fullName).toBe('Traveler full name is required.');
    expect(errors.email).toBe('Email address is required.');
    expect(errors.phone).toBe('Phone number is required.');
    expect(errors.travelerCount).toBe('Number of travelers is required.');
    expect(errors.travelDate).toBe('Preferred travel date is required.');
  });

  it('2. Rejects invalid email addresses', () => {
    const badEmails = ['plain', 'user@', '@domain.com', 'user@domain', 'spaces in@test.com'];
    for (const badEmail of badEmails) {
      const errors = validateBookingPayload({
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email: badEmail,
        phone: '9876543210',
        travelerCount: 2,
        travelDate: '2027-10-10',
      });
      expect(errors.email).toBe('Please enter a valid email address (e.g. name@example.com).');
    }
  });

  it('3. Rejects invalid phone numbers (< 10 digits, letters, or > 15 digits)', () => {
    const badPhones = ['123', '987654321', 'phone12345678', '12345678901234567890'];
    for (const badPhone of badPhones) {
      const errors = validateBookingPayload({
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email: 'traveler@example.com',
        phone: badPhone,
        travelerCount: 2,
        travelDate: '2027-10-10',
      });
      expect(errors.phone).toBe('Please enter a valid phone number (minimum 10 digits).');
    }
  });

  it('4. Rejects non-positive or decimal traveler counts (0, -1, 1.5, non-numeric)', () => {
    const badCounts = [0, -2, 1.5, 'abc'];
    for (const badCount of badCounts) {
      const errors = validateBookingPayload({
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email: 'traveler@example.com',
        phone: '9876543210',
        travelerCount: badCount,
        travelDate: '2027-10-10',
      });
      expect(errors.travelerCount).toBe('Number of travelers must be a whole number of at least 1.');
    }
  });

  it('5. Rejects travel dates in the past', () => {
    const errors = validateBookingPayload({
      packageId: 'pkg-1',
      fullName: 'Valid Name',
      email: 'traveler@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2020-01-01',
    });
    expect(errors.travelDate).toBe('Preferred travel date cannot be in the past.');
  });

  it('6. Accepts completely valid booking payload', () => {
    const validPayload = {
      packageId: 'pkg-1',
      fullName: 'Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      phone: '+91 98765 43210',
      travelerCount: 4,
      travelDate: '2027-06-15',
      additionalRequests: 'Require ground floor rooms',
    };
    const errors = validateBookingPayload(validPayload);
    expect(Object.keys(errors).length).toBe(0);
  });
});

describe('TAMS-34: Booking Controller & API Endpoints', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('1. Creates booking successfully and calculates correct total price based on package and travelers', () => {
    const payload = {
      packageId: 'pkg-1', // price is 12999
      fullName: 'Rohan Mehra',
      email: 'rohan.mehra@example.com',
      phone: '+91 99887 76655',
      travelerCount: 2,
      travelDate: '2027-03-25',
      additionalRequests: 'Late checkout if possible',
    };

    const res = handleCreateBooking(db, payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
    expect(res.body.booking.status).toBe('Pending');
    expect(res.body.booking.totalPrice).toBe(25998); // 12999 * 2
    expect(res.body.booking.packageTitle).toBe('Coastal Escape');

    // Verify record actually exists in database
    const saved = getBookingByReference(db, res.body.booking.bookingReference);
    expect(saved).toBeDefined();
    expect(saved.fullName).toBe('Rohan Mehra');
  });

  it('2. Rejects invalid requests with HTTP 400 and creates NO database record', () => {
    const initialCount = getAllBookings(db).length;

    const invalidPayload = {
      packageId: 'pkg-1',
      fullName: 'A', // too short (< 2 chars)
      email: 'bad-email',
      phone: '123', // too short
      travelerCount: 0,
      travelDate: '2020-01-01', // past date
    };

    const res = handleCreateBooking(db, invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.fullName).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.phone).toBeDefined();
    expect(res.body.errors.travelerCount).toBeDefined();
    expect(res.body.errors.travelDate).toBeDefined();

    // Verify zero records were created in the database
    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('3. Rejects nonexistent package identifier with HTTP 404 and creates NO database record', () => {
    const initialCount = getAllBookings(db).length;

    const nonexistentPayload = {
      packageId: 'pkg-nonexistent-999',
      fullName: 'Valid Name',
      email: 'valid@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-10-10',
    };

    const res = handleCreateBooking(db, nonexistentPayload);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('pkg-nonexistent-999');
    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('4. Retrieves booking by reference via handleGetBookingByReference', () => {
    const created = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Pooja Verma',
      email: 'pooja@example.com',
      phone: '9876543210',
      travelerCount: 1,
      travelDate: '2027-05-10',
    });

    const ref = created.body.booking.bookingReference;
    const fetchRes = handleGetBookingByReference(db, ref);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.booking.fullName).toBe('Pooja Verma');

    const notFoundRes = handleGetBookingByReference(db, 'BK-NONEXISTENT-999');
    expect(notFoundRes.status).toBe(404);
  });

  it('5. API Dispatcher handles HTTP POST /api/bookings and GET /api/packages', async () => {
    // Test GET /api/packages
    let statusCode = null;
    let responseHeaders = null;
    let responseData = '';

    const mockRes = {
      writeHead: (status, h) => {
        statusCode = status;
        responseHeaders = h;
      },
      end: (data) => {
        responseData = data;
      },
    };

    const mockGetReq = {
      method: 'GET',
      url: '/api/packages',
      on: () => {},
    };

    await handleApiRequest(mockGetReq, mockRes, db);
    expect(statusCode).toBe(200);
    expect(responseHeaders['Content-Type']).toBe('application/json');
    const packages = JSON.parse(responseData);
    expect(packages.length).toBeGreaterThan(0);

    // Test POST /api/bookings
    const bookingPayload = {
      packageId: 'pkg-1',
      fullName: 'Dispatcher Test',
      email: 'dispatcher@test.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-08-10',
    };

    const mockPostReq = {
      method: 'POST',
      url: '/api/bookings',
      on: (event, handler) => {
        if (event === 'data') {
          handler(Buffer.from(JSON.stringify(bookingPayload)));
        }
        if (event === 'end') {
          handler();
        }
      },
    };

    await handleApiRequest(mockPostReq, mockRes, db);
    expect(statusCode).toBe(201);
    const createdBookingRes = JSON.parse(responseData);
    expect(createdBookingRes.success).toBe(true);
    expect(createdBookingRes.booking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
  });
});

describe('TAMS-34: Client Booking Service (bookingService.js)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Successfully calls POST /api/bookings and returns parsed booking', async () => {
    const mockBooking = {
      id: 1,
      bookingReference: 'BK-20261020-TEST',
      packageId: 'pkg-1',
      fullName: 'Service Test',
      email: 'service@test.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-09-15',
      status: 'Pending',
      totalPrice: 25998,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, booking: mockBooking }),
    });

    const result = await clientCreateBooking({
      packageId: 'pkg-1',
      fullName: 'Service Test',
      email: 'service@test.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-09-15',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({ method: 'POST' }));
    expect(result.success).toBe(true);
    expect(result.booking.bookingReference).toBe('BK-20261020-TEST');
  });

  it('2. Throws BookingApiError with field errors on HTTP 400 validation error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        success: false,
        message: 'Booking validation failed.',
        errors: { email: 'Please enter a valid email address.' },
      }),
    });

    await expect(
      clientCreateBooking({ packageId: 'pkg-1' })
    ).rejects.toThrow('Booking validation failed.');
  });

  it('3. Throws clean error on network connectivity failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      clientCreateBooking({ packageId: 'pkg-1' })
    ).rejects.toThrow('Failed to fetch');
  });
});

describe('TAMS-34: Frontend Integration & Visual State Validation', () => {
  const sampleGoa = SAMPLE_PACKAGES.find((p) => p.id === 'pkg-1');

  it('1. Displays confirmed booking view with unique booking reference and Pending status badge', () => {
    const confirmedBooking = {
      id: 10,
      bookingReference: 'BK-20261020-8A7B',
      packageId: 'pkg-1',
      packageTitle: 'Coastal Escape',
      packageDestination: 'Goa',
      fullName: 'Ananya Roy',
      email: 'ananya@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-05-20',
      additionalRequests: 'Vegetarian meals',
      status: 'Pending',
      totalPrice: 25998,
      formattedTotal: '₹25,998',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialSubmittedData: confirmedBooking,
      })
    );

    // Confirmation header and success banner
    expect(html).toContain('Booking Request Confirmed!');
    expect(html).toContain('Your travel booking request has been successfully created and recorded in our database.');

    // Unique booking reference and Pending status
    expect(html).toContain('id="booking-reference-code"');
    expect(html).toContain('BK-20261020-8A7B');
    expect(html).toContain('id="booking-status-badge"');
    expect(html).toContain('Pending');
    expect(html).toContain('status-pending');

    // Traveler details
    expect(html).toContain('Ananya Roy');
    expect(html).toContain('ananya@example.com');
    expect(html).toContain('+91 98765 43210');
    expect(html).toContain('2027-05-20');
    expect(html).toContain('2 people');
    expect(html).toContain('₹25,998');
    expect(html).toContain('Vegetarian meals');

    // Action buttons
    expect(html).toContain('id="book-another-btn"');
    expect(html).toContain('+ Book Another Trip');
    expect(html).toContain('id="return-to-details-btn"');
    expect(html).toContain('Return to Package Details');
  });

  it('2. Displays global server error banner and preserves form field values upon submission error', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialValues: {
          fullName: 'Karan Singh',
          email: 'karan@example.com',
          phone: '+91 98765 43210',
          travelerCount: '3',
          travelDate: '2027-06-15',
          additionalRequests: 'Quiet room on upper floor',
        },
        initialServerError: 'The selected travel package is currently unavailable.',
      })
    );

    // Error banner displayed with role="alert"
    expect(html).toContain('id="booking-server-error"');
    expect(html).toContain('Submission Unsuccessful');
    expect(html).toContain('The selected travel package is currently unavailable.');

    // User-entered values are fully preserved
    expect(html).toContain('value="Karan Singh"');
    expect(html).toContain('value="karan@example.com"');
    expect(html).toContain('value="+91 98765 43210"');
    expect(html).toContain('value="3"');
    expect(html).toContain('value="2027-06-15"');
    expect(html).toContain('Quiet room on upper floor');
  });

  it('3. Form displays disabled submit button and busy state when submission is in flight', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
      })
    );

    expect(html).toContain('id="submit-booking-btn"');
    expect(html).toContain('Submit Booking Request');
    expect(html).toContain('btn-submit-booking');
  });
});
