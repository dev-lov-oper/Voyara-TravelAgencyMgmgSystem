/**
 * Booking Controller for Voyara TAMS
 * Handles server-side validation, package verification, reference generation,
 * and database persistence.
 */
import {
  isValidEmail,
  isValidPhone,
  isValidTravelerCount,
  isValidTravelDate,
} from '../../utils/bookingValidation.js';
import { getPackageById } from '../models/packageModel.js';
import { createBooking, getBookingByReference } from '../models/bookingModel.js';

/**
 * Validates incoming booking request payload on the server.
 *
 * @param {Object} payload
 * @returns {Object} Object containing errors map (empty if valid)
 */
export function validateBookingPayload(payload = {}) {
  const errors = {};

  // 1. Package ID (required)
  if (!payload.packageId || typeof payload.packageId !== 'string' || !payload.packageId.trim()) {
    errors.packageId = 'Package identifier is required.';
  }

  // 2. Traveler Full Name (required, min 2 chars)
  if (!payload.fullName || typeof payload.fullName !== 'string' || !payload.fullName.trim()) {
    errors.fullName = 'Traveler full name is required.';
  } else if (payload.fullName.trim().length < 2) {
    errors.fullName = 'Please enter a valid full name (at least 2 characters).';
  }

  // 3. Email Address (required, valid format)
  if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(payload.email)) {
    errors.email = 'Please enter a valid email address (e.g. name@example.com).';
  }

  // 4. Phone Number (required, 10-15 digits)
  if (!payload.phone || typeof payload.phone !== 'string' || !payload.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidPhone(payload.phone)) {
    errors.phone = 'Please enter a valid phone number (minimum 10 digits).';
  }

  // 5. Traveler Count (required, positive whole integer >= 1)
  if (payload.travelerCount === undefined || payload.travelerCount === null || payload.travelerCount === '') {
    errors.travelerCount = 'Number of travelers is required.';
  } else if (!isValidTravelerCount(payload.travelerCount)) {
    errors.travelerCount = 'Number of travelers must be a whole number of at least 1.';
  }

  // 6. Travel Date (required, valid YYYY-MM-DD, not in past)
  if (!payload.travelDate || typeof payload.travelDate !== 'string' || !payload.travelDate.trim()) {
    errors.travelDate = 'Preferred travel date is required.';
  } else if (!isValidTravelDate(payload.travelDate)) {
    errors.travelDate = 'Preferred travel date cannot be in the past.';
  }

  return errors;
}

/**
 * Handles creation of a new booking request.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} body - Request body
 * @returns {{ status: number, body: Object }}
 */
export function handleCreateBooking(db, body) {
  // 1. Validate payload fields
  const validationErrors = validateBookingPayload(body);
  if (Object.keys(validationErrors).length > 0) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Booking validation failed. Please check the submitted fields.',
        errors: validationErrors,
      },
    };
  }

  // 2. Verify selected package exists in database
  const packageId = body.packageId.trim();
  const pkg = getPackageById(db, packageId);

  if (!pkg) {
    return {
      status: 404,
      body: {
        success: false,
        message: `The selected travel package '${packageId}' does not exist or is no longer available.`,
        errors: {
          packageId: `Package with ID '${packageId}' was not found in catalog.`,
        },
      },
    };
  }

  if (!pkg.isActive) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'The selected travel package is currently inactive and not accepting bookings.',
        errors: {
          packageId: 'Selected package is not active.',
        },
      },
    };
  }

  // 3. Compute pricing
  const travelerCount = Number(body.travelerCount);
  const pricePerPerson = Number(pkg.price) || 0;
  const totalPrice = pricePerPerson * travelerCount;

  // 4. Persist booking to database
  try {
    const booking = createBooking(db, {
      packageId: pkg.id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      travelerCount,
      travelDate: body.travelDate,
      additionalRequests: body.additionalRequests || '',
      status: 'Pending',
      totalPrice,
      bookingReference: body.bookingReference, // Optional for testing
    });

    return {
      status: 201,
      body: {
        success: true,
        message: 'Booking request created successfully.',
        booking,
      },
    };
  } catch (error) {
    console.error('[BookingController] Database insertion failure:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: 'A database error occurred while creating your booking request. Please try again.',
        error: error.message,
      },
    };
  }
}

/**
 * Handles retrieval of a booking by reference.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} reference
 * @returns {{ status: number, body: Object }}
 */
export function handleGetBookingByReference(db, reference) {
  if (!reference) {
    return {
      status: 400,
      body: { success: false, message: 'Booking reference is required.' },
    };
  }

  const booking = getBookingByReference(db, reference);
  if (!booking) {
    return {
      status: 404,
      body: {
        success: false,
        message: `Booking with reference '${reference}' was not found.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      booking,
    },
  };
}
