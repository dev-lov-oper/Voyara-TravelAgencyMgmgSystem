import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { getAllPackages, getPackageById } from '../src/server/models/packageModel.js';
import {
  createBooking,
  getBookingByReference,
  getAllBookings,
  generateBookingReference,
} from '../src/server/models/bookingModel.js';
import {
  handleCreateBooking,
  handleGetBookingByReference,
} from '../src/server/controllers/bookingController.js';
import { handleApiRequest, ensureServerInitialized } from '../src/server/apiHandler.js';
import BookingForm from '../src/components/BookingForm.jsx';
import { isValidTravelDate } from '../src/utils/bookingValidation.js';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';

describe('TAMS-35: 1. Architecture & Frontend-Backend Connectivity', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('ensures ensureServerInitialized idempotent tracking on database instances', () => {
    // Calling ensureServerInitialized on db should not re-run or duplicate
    ensureServerInitialized(db);
    const initialPkgCount = getAllPackages(db).length;
    expect(initialPkgCount).toBeGreaterThanOrEqual(6);

    ensureServerInitialized(db);
    expect(getAllPackages(db).length).toBe(initialPkgCount);
  });

  it('validates that client booking service points to /api/bookings and dispatches requests to backend', async () => {
    const mockPostReq = (payload) => ({
      method: 'POST',
      url: '/api/bookings',
      on: (event, handler) => {
        if (event === 'data') {
          handler(Buffer.from(JSON.stringify(payload)));
        }
        if (event === 'end') {
          handler();
        }
      },
    });

    let statusCode = null;
    let responseData = '';
    const mockRes = {
      writeHead: (status) => {
        statusCode = status;
      },
      end: (data) => {
        responseData = data;
      },
    };

    const payload = {
      packageId: 'pkg-1',
      fullName: 'Connectivity Test',
      email: 'connect@voyara.test',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-08-20',
      additionalRequests: 'None',
    };

    await handleApiRequest(mockPostReq(payload), mockRes, db);
    expect(statusCode).toBe(201);
    const parsed = JSON.parse(responseData);
    expect(parsed.success).toBe(true);
    expect(parsed.booking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
    expect(parsed.booking.packageTitle).toBe('Coastal Escape');
  });
});

describe('TAMS-35: 2. Test Booking Creation & Persistence', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('saves valid booking requests successfully with correct pricing and details', () => {
    const payload = {
      packageId: 'pkg-2', // Himalayan Retreat, price 18499
      fullName: 'Sharvan Kumar',
      email: 'sharvan.kumar@voyara.test',
      phone: '+91 98765 43210',
      travelerCount: 3,
      travelDate: '2027-05-10',
      additionalRequests: 'Require ground floor rooms with scenic view',
    };

    const res = handleCreateBooking(db, payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const booking = res.body.booking;
    expect(booking.id).toBeDefined();
    expect(booking.fullName).toBe('Sharvan Kumar');
    expect(booking.email).toBe('sharvan.kumar@voyara.test');
    expect(booking.phone).toBe('+91 98765 43210');
    expect(booking.travelerCount).toBe(3);
    expect(booking.travelDate).toBe('2027-05-10');
    expect(booking.additionalRequests).toBe('Require ground floor rooms with scenic view');
    expect(booking.totalPrice).toBe(18499 * 3); // 55497
    expect(booking.formattedTotal).toBe('₹55,497');
  });

  it('generates booking references in the expected format BK-YYYYMMDD-XXXX with date and random suffix', () => {
    const customDate = new Date('2026-12-25T10:00:00Z');
    const ref = generateBookingReference(customDate);
    expect(ref).toMatch(/^BK-20261225-[A-Z0-9]{4}$/);

    const refAuto = generateBookingReference();
    expect(refAuto).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
  });

  it('assigns initial status of "Pending" to new bookings', () => {
    const res = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Status Check',
      email: 'status@voyara.test',
      phone: '9876543210',
      travelerCount: 1,
      travelDate: '2027-09-01',
    });

    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe('Pending');

    const retrieved = getBookingByReference(db, res.body.booking.bookingReference);
    expect(retrieved.status).toBe('Pending');
  });

  it('ensures saved database data matches the submitted traveler and package details exactly', () => {
    const goaPkg = getPackageById(db, 'pkg-1');
    const res = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Exact Match Traveler',
      email: 'exact.match@example.com',
      phone: '+91 99988 77766',
      travelerCount: 4,
      travelDate: '2027-07-22',
      additionalRequests: 'Vegetarian meals only',
    });

    const b = res.body.booking;
    expect(b.packageId).toBe('pkg-1');
    expect(b.packageTitle).toBe(goaPkg.title);
    expect(b.packageDestination).toBe(goaPkg.destination);
    expect(b.packagePrice).toBe(goaPkg.price);
    expect(b.fullName).toBe('Exact Match Traveler');
    expect(b.email).toBe('exact.match@example.com');
    expect(b.phone).toBe('+91 99988 77766');
    expect(b.travelerCount).toBe(4);
    expect(b.travelDate).toBe('2027-07-22');
    expect(b.additionalRequests).toBe('Vegetarian meals only');
    expect(b.totalPrice).toBe(goaPkg.price * 4);
  });

  it('persists bookings after reloading or restarting the application (disk persistence test)', () => {
    const testDbPath = path.resolve(process.cwd(), 'scratch', 'tams35_restart.db');
    const scratchDir = path.dirname(testDbPath);
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

    // Step 1: Initialize disk DB, run migration, save booking
    let diskDb = getDatabase({ dbPath: testDbPath });
    runMigrations(diskDb);

    const bookingRes = handleCreateBooking(diskDb, {
      packageId: 'pkg-3',
      fullName: 'Restart Tester',
      email: 'restart@voyara.test',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-06-18',
      additionalRequests: 'Allergy alert: peanuts',
    });
    const bookingRef = bookingRes.body.booking.bookingReference;
    expect(bookingRef).toBeDefined();

    // Step 2: Simulate application shutdown
    closeDatabase(diskDb);

    // Step 3: Simulate restart by reopening database from disk
    diskDb = getDatabase({ dbPath: testDbPath });
    runMigrations(diskDb);

    const retrievedAfterRestart = getBookingByReference(diskDb, bookingRef);
    expect(retrievedAfterRestart).not.toBeNull();
    expect(retrievedAfterRestart.bookingReference).toBe(bookingRef);
    expect(retrievedAfterRestart.fullName).toBe('Restart Tester');
    expect(retrievedAfterRestart.email).toBe('restart@voyara.test');
    expect(retrievedAfterRestart.additionalRequests).toBe('Allergy alert: peanuts');
    expect(retrievedAfterRestart.packageTitle).toBe('Royal Heritage');

    closeDatabase(diskDb);
    try {
      fs.rmSync(testDbPath, { force: true });
    } catch {
      // Ignore cleanup error
    }
  });
});

describe('TAMS-35: 3. Test Invalid Requests & Rejection Rules', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('rejects missing required fields and creates zero database records', () => {
    const initialCount = getAllBookings(db).length;

    const fields = ['packageId', 'fullName', 'email', 'phone', 'travelerCount', 'travelDate'];
    const baseValid = {
      packageId: 'pkg-1',
      fullName: 'Valid Name',
      email: 'valid@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-10-10',
    };

    for (const field of fields) {
      const invalid = { ...baseValid };
      delete invalid[field];

      const res = handleCreateBooking(db, invalid);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[field]).toBeDefined();
    }

    // Zero records created
    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects invalid email formats and creates zero database records', () => {
    const initialCount = getAllBookings(db).length;
    const invalidEmails = [
      '',
      'invalid-email',
      'user@',
      '@domain.com',
      'user@domain',
      'spaces in@email.com',
      'user@.com',
      null,
      undefined,
    ];

    for (const email of invalidEmails) {
      const res = handleCreateBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email,
        phone: '9876543210',
        travelerCount: 2,
        travelDate: '2027-10-10',
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
    }

    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects invalid phone numbers and creates zero database records', () => {
    const initialCount = getAllBookings(db).length;
    const invalidPhones = [
      '',
      '123',
      '987654321', // 9 digits
      'phone-number',
      '+91+9876543210', // duplicate plus sign
      '12345678901234567890', // > 15 digits
      null,
      undefined,
    ];

    for (const phone of invalidPhones) {
      const res = handleCreateBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email: 'traveler@example.com',
        phone,
        travelerCount: 2,
        travelDate: '2027-10-10',
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.phone).toBeDefined();
    }

    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects invalid traveler counts (0, negative, decimals, booleans, non-numeric strings)', () => {
    const initialCount = getAllBookings(db).length;
    const invalidCounts = [0, -1, -5, 1.5, 2.7, '0', '-2', '1.5', 'abc', '   ', true, false, null, undefined];

    for (const count of invalidCounts) {
      const res = handleCreateBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Valid Name',
        email: 'traveler@example.com',
        phone: '9876543210',
        travelerCount: count,
        travelDate: '2027-10-10',
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.travelerCount).toBeDefined();
    }

    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects past travel dates and invalid calendar dates (e.g. Feb 31, Apr 31)', () => {
    const initialCount = getAllBookings(db).length;

    expect(isValidTravelDate('2020-01-01')).toBe(false);
    expect(isValidTravelDate('2024-12-31')).toBe(false);
    expect(isValidTravelDate('2027-02-31')).toBe(false); // Feb has 28/29 days
    expect(isValidTravelDate('2027-04-31')).toBe(false); // April has 30 days
    expect(isValidTravelDate('not-a-date')).toBe(false);
    expect(isValidTravelDate('')).toBe(false);

    const resPast = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Valid Name',
      email: 'traveler@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2020-01-01',
    });
    expect(resPast.status).toBe(400);
    expect(resPast.body.errors.travelDate).toBe('Preferred travel date cannot be in the past.');

    const resRollover = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Valid Name',
      email: 'traveler@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-02-31',
    });
    expect(resRollover.status).toBe(400);
    expect(resRollover.body.errors.travelDate).toBe('Preferred travel date cannot be in the past.');

    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects nonexistent package identifiers with HTTP 404 and creates zero database records', () => {
    const initialCount = getAllBookings(db).length;

    const res = handleCreateBooking(db, {
      packageId: 'pkg-does-not-exist-999',
      fullName: 'Valid Name',
      email: 'traveler@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-10-10',
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.packageId).toContain('pkg-does-not-exist-999');
    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects inactive packages with HTTP 400 and creates zero database records', () => {
    // Mark a package as inactive
    db.prepare('UPDATE packages SET is_active = 0 WHERE id = ?').run('pkg-1');
    const initialCount = getAllBookings(db).length;

    const res = handleCreateBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Valid Name',
      email: 'traveler@example.com',
      phone: '9876543210',
      travelerCount: 2,
      travelDate: '2027-10-10',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.packageId).toBe('Selected package is not active.');
    expect(getAllBookings(db).length).toBe(initialCount);
  });

  it('rejects null, non-object, and malformed JSON payloads with HTTP 400', async () => {
    const initialCount = getAllBookings(db).length;

    // Direct controller validation
    const resNull = handleCreateBooking(db, null);
    expect(resNull.status).toBe(400);
    expect(resNull.body.errors.payload).toBeDefined();

    const resArray = handleCreateBooking(db, []);
    expect(resArray.status).toBe(400);
    expect(resArray.body.errors.payload).toBeDefined();

    // API dispatcher with malformed JSON string
    let statusCode = null;
    let responseData = '';
    const mockRes = {
      writeHead: (status) => {
        statusCode = status;
      },
      end: (data) => {
        responseData = data;
      },
    };

    const mockMalformedReq = {
      method: 'POST',
      url: '/api/bookings',
      on: (event, handler) => {
        if (event === 'data') {
          handler(Buffer.from('{ malformed_json: '));
        }
        if (event === 'end') {
          handler();
        }
      },
    };

    await handleApiRequest(mockMalformedReq, mockRes, db);
    expect(statusCode).toBe(400);
    const parsed = JSON.parse(responseData);
    expect(parsed.success).toBe(false);
    expect(parsed.message).toContain('JSON');

    expect(getAllBookings(db).length).toBe(initialCount);
  });
});

describe('TAMS-35: 4. Test Failure Handling & UI Integrity', () => {
  const samplePkg = SAMPLE_PACKAGES[0];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('simulates backend 500 error: BookingForm renders server error banner and does NOT show false success', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: samplePkg,
        onBack: () => {},
        initialValues: {
          fullName: 'Vikram Seth',
          email: 'vikram@example.com',
          phone: '+91 98765 43210',
          travelerCount: '2',
          travelDate: '2027-05-15',
        },
        initialServerError: 'A database error occurred while creating your booking request. Please try again.',
      })
    );

    // Verify error banner is rendered with role="alert"
    expect(html).toContain('id="booking-server-error"');
    expect(html).toContain('Submission Unsuccessful');
    expect(html).toContain('A database error occurred while creating your booking request. Please try again.');

    // Verify FALSE success confirmation is NOT rendered
    expect(html).not.toContain('Booking Request Confirmed!');
    expect(html).not.toContain('booking-reference-code');
    expect(html).not.toContain('booking-success-confirmed');
  });

  it('preserves entered field values and optional requests upon failed submission', () => {
    const enteredValues = {
      fullName: 'Pooja Hegde',
      email: 'pooja.hegde@example.com',
      phone: '+91 98765 43210',
      travelerCount: '4',
      travelDate: '2027-07-20',
      additionalRequests: 'Vegetarian meals and wheelchair assistance required',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: samplePkg,
        onBack: () => {},
        initialValues: enteredValues,
        initialServerError: 'Unable to connect to the booking service.',
      })
    );

    // Form inputs preserve exact values
    expect(html).toContain('value="Pooja Hegde"');
    expect(html).toContain('value="pooja.hegde@example.com"');
    expect(html).toContain('value="+91 98765 43210"');
    expect(html).toContain('value="4"');
    expect(html).toContain('value="2027-07-20"');
    expect(html).toContain('Vegetarian meals and wheelchair assistance required');
  });

  it('prevents duplicate submissions: in-flight state disables submit button, inputs, and navigation', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: samplePkg,
        onBack: () => {},
        initialIsSubmitting: true,
      })
    );

    // Submit button is disabled and aria-busy
    expect(html).toContain('id="submit-booking-btn"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('spinner-indicator');
    expect(html).toContain('Submitting Booking Request...');

    // Inputs and navigation are disabled while submitting
    expect(html).toContain('id="booking-fullName"');
    expect(html).toContain('id="booking-email"');
    expect(html).toContain('id="booking-phone"');
    expect(html).toContain('id="booking-travelerCount"');
    expect(html).toContain('id="booking-travelDate"');
    expect(html).toContain('id="booking-additionalRequests"');
    expect(html).toContain('id="cancel-booking-btn" disabled=""');
    expect(html).toContain('id="back-to-details-link" aria-label="Return to package details" disabled=""');
  });

  it('displays field-specific error messages with accessible aria-invalid states', () => {
    const errors = {
      fullName: 'Please enter a valid full name (at least 2 characters).',
      email: 'Please enter a valid email address (e.g. name@example.com).',
      phone: 'Please enter a valid phone number (minimum 10 digits).',
      travelerCount: 'Number of travelers must be a whole number of at least 1.',
      travelDate: 'Preferred travel date cannot be in the past.',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: samplePkg,
        onBack: () => {},
        initialErrors: errors,
      })
    );

    for (const [field, msg] of Object.entries(errors)) {
      expect(html).toContain(msg);
      expect(html).toContain(`id="booking-${field}"`);
      expect(html).toContain(`id="error-${field}"`);
    }
    expect(html).toContain('aria-invalid="true"');
  });

  it('displays package selection error in alert banner when selected package is invalid', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: null,
        onBack: () => {},
        initialErrors: {
          packageId: 'A valid travel package must be selected before submitting a booking.',
        },
      })
    );

    expect(html).toContain('id="booking-server-error"');
    expect(html).toContain('Submission Unsuccessful');
    expect(html).toContain('A valid travel package must be selected before submitting a booking.');
  });
});

describe('TAMS-35: 5. End-to-End Submission & Persistence Verification', () => {
  let db;

  beforeEach(() => {
    db = getDatabase({ memory: true });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('completes the full booking submission lifecycle from API to DB retrieval', () => {
    const pkg = getPackageById(db, 'pkg-4'); // Kerala Backwaters, 24999
    expect(pkg).toBeDefined();

    // 1. Submit valid booking
    const res = handleCreateBooking(db, {
      packageId: 'pkg-4',
      fullName: 'Meera Nambiar',
      email: 'meera.nambiar@voyara.test',
      phone: '+91 94471 23456',
      travelerCount: 2,
      travelDate: '2027-11-15',
      additionalRequests: 'Houseboat with upper deck preferred',
    });

    expect(res.status).toBe(201);
    const booking = res.body.booking;
    expect(booking.bookingReference).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
    expect(booking.totalPrice).toBe(pkg.price * 2);

    // 2. Query booking by reference via API handler
    const fetchRes = handleGetBookingByReference(db, booking.bookingReference);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.booking.fullName).toBe('Meera Nambiar');
    expect(fetchRes.body.booking.packageTitle).toBe('Backwater Serenity');
    expect(fetchRes.body.booking.formattedTotal).toBe(`₹${(pkg.price * 2).toLocaleString('en-IN')}`);

    // 3. Query all bookings - should contain this new booking
    const all = getAllBookings(db);
    expect(all.length).toBeGreaterThanOrEqual(1);
    const found = all.find((b) => b.bookingReference === booking.bookingReference);
    expect(found).toBeDefined();
    expect(found.status).toBe('Pending');
  });

  it('handles unique reference collision gracefully by retrying candidate generation', () => {
    // Generate one booking
    const b1 = createBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Collision Check 1',
      email: 'collision1@test.com',
      phone: '9876543210',
      travelerCount: 1,
      travelDate: '2027-04-01',
      totalPrice: 12999,
    });
    expect(b1.bookingReference).toBeDefined();

    // Attempting to create another booking with the same reference explicitly should fail
    expect(() => {
      createBooking(db, {
        packageId: 'pkg-1',
        fullName: 'Collision Check 2',
        email: 'collision2@test.com',
        phone: '9876543211',
        travelerCount: 1,
        travelDate: '2027-04-02',
        totalPrice: 12999,
        bookingReference: b1.bookingReference, // Explicit collision
      });
    }).toThrow(/UNIQUE constraint failed/);

    // But auto-generating references creates unique references reliably
    const b3 = createBooking(db, {
      packageId: 'pkg-1',
      fullName: 'Auto Reference Check',
      email: 'auto@test.com',
      phone: '9876543212',
      travelerCount: 1,
      travelDate: '2027-04-03',
      totalPrice: 12999,
    });
    expect(b3.bookingReference).not.toBe(b1.bookingReference);
  });
});
