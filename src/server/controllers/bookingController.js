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
import { createBooking, getBookingByReference, getBookingsByCustomer, getAllBookings } from '../models/bookingModel.js';
import { createCustomerToken, createAgentToken } from '../auth.js';
import { createUser, getUserByEmail } from '../models/userModel.js';


/**
 * Validates incoming booking request payload on the server.
 *
 * @param {Object} payload
 * @returns {Object} Object containing errors map (empty if valid)
 */
export function validateBookingPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      payload: 'Booking request body must be a valid JSON object.',
    };
  }
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

    const token = createCustomerToken({
      email: booking.email,
      fullName: booking.fullName,
    });

    // Associate simple password with user account (defaults to voyara123 if not provided)
    try {
      createUser(db, {
        email: booking.email,
        password: (body.password || 'voyara123').trim(),
        fullName: booking.fullName,
      });
    } catch {
      // Ignore user creation error if table not ready
    }

    return {
      status: 201,
      body: {
        success: true,
        message: 'Booking request created successfully.',
        booking,
        token,
        customer: {
          email: booking.email,
          fullName: booking.fullName,
        },
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
 * Handles retrieval of a booking by reference, with optional customer authorization verification.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} reference
 * @param {Object} [authenticatedCustomer]
 * @returns {{ status: number, body: Object }}
 */
export function handleGetBookingByReference(db, reference, authenticatedCustomer = null) {
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

  // If request is authenticated, enforce customer isolation
  if (authenticatedCustomer && authenticatedCustomer.email) {
    const isOwner = booking.email && booking.email.toLowerCase() === authenticatedCustomer.email.toLowerCase();
    if (!isOwner) {
      return {
        status: 403,
        body: {
          success: false,
          message: 'You do not have permission to access this booking record.',
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      booking,
    },
  };
}

/**
 * Handles customer authentication / login via registered email and optional booking reference.
 * Returns a signed token scoped to the customer.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} credentials
 * @returns {{ status: number, body: Object }}
 */
/**
 * Handles customer authentication / login via registered email and simple password.
 * Authenticates user credentials using simple password association.
 * Returns a signed token scoped to the customer.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} credentials
 * @returns {{ status: number, body: Object }}
 */
export function handleCustomerLogin(db, credentials) {
  if (!credentials || typeof credentials !== 'object') {
    return {
      status: 400,
      body: { success: false, message: 'Invalid login request payload.' },
    };
  }

  const email = (credentials.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return {
      status: 400,
      body: { success: false, message: 'A valid customer email address is required.' },
    };
  }

  const password = typeof credentials.password === 'string' ? credentials.password.trim() : '';
  if (!password) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Password is required to sign in.',
        errors: {
          password: 'Password is required.',
        },
      },
    };
  }

  // Find user account
  let user = getUserByEmail(db, email);
  const customerBookings = getBookingsByCustomer(db, email);

  // If user account not found in users table but bookings exist, auto-create user with default password
  if (!user && customerBookings.length > 0) {
    user = createUser(db, {
      email,
      password: 'voyara123',
      fullName: customerBookings[0].fullName,
    });
  }

  if (!user && customerBookings.length === 0) {
    return {
      status: 404,
      body: {
        success: false,
        message: `No account or booking records found for email address '${email}'.`,
      },
    };
  }

  // Verify password (simple password match)
  const isMatch = user && user.password === password;
  if (!isMatch) {
    return {
      status: 401,
      body: {
        success: false,
        message: 'Invalid password. Please enter the correct password associated with your account.',
      },
    };
  }

  const fullName = user.full_name || (customerBookings[0] ? customerBookings[0].fullName : '');
  const token = createCustomerToken({
    email,
    fullName,
  });

  return {
    status: 200,
    body: {
      success: true,
      message: 'Authentication successful.',
      token,
      customer: {
        email,
        fullName,
      },
      bookingsCount: customerBookings.length,
    },
  };
}

/**
 * Handles retrieving bookings for the authenticated customer.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} authenticatedCustomer
 * @returns {{ status: number, body: Object }}
 */
export function handleGetCustomerBookings(db, authenticatedCustomer) {
  if (!authenticatedCustomer || !authenticatedCustomer.email) {
    return {
      status: 401,
      body: {
        success: false,
        message: 'Authentication required to access booking records.',
      },
    };
  }

  const bookings = getBookingsByCustomer(db, authenticatedCustomer.email);

  return {
    status: 200,
    body: {
      success: true,
      customer: {
        email: authenticatedCustomer.email,
        fullName: authenticatedCustomer.fullName || '',
      },
      bookings,
    },
  };
}

/**
 * Handles agent authentication / login via registered agent email and password.
 * Returns a signed token scoped with role: 'agent'.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} credentials
 * @returns {{ status: number, body: Object }}
 */
export function handleAgentLogin(db, credentials) {
  if (!credentials || typeof credentials !== 'object') {
    return {
      status: 400,
      body: { success: false, message: 'Invalid agent login request payload.' },
    };
  }

  const email = (credentials.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return {
      status: 400,
      body: { success: false, message: 'A valid agent email address is required.' },
    };
  }

  const password = typeof credentials.password === 'string' ? credentials.password.trim() : '';
  if (!password) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Password is required to sign in as an agent.',
        errors: {
          password: 'Password is required.',
        },
      },
    };
  }

  let user = getUserByEmail(db, email);

  // Auto-seed default agent account if agent@voyara.com is used
  if (!user && email === 'agent@voyara.com') {
    user = createUser(db, {
      email: 'agent@voyara.com',
      password: 'agent123',
      fullName: 'Voyara Travel Agent',
      role: 'agent',
    });
  }

  if (!user) {
    return {
      status: 404,
      body: {
        success: false,
        message: `Agent account '${email}' was not found. Please contact an administrator.`,
      },
    };
  }

  // Verify password
  if (user.password !== password) {
    return {
      status: 401,
      body: {
        success: false,
        message: 'Invalid agent credentials. Please check your email and password.',
      },
    };
  }

  // Verify role
  if (user.role !== 'agent') {
    return {
      status: 403,
      body: {
        success: false,
        message: 'Access denied. The provided credentials do not have agent permissions.',
      },
    };
  }

  const fullName = user.full_name || 'Voyara Travel Agent';
  const token = createAgentToken({
    email,
    fullName,
  });

  return {
    status: 200,
    body: {
      success: true,
      message: 'Agent authentication successful.',
      token,
      agent: {
        email,
        fullName,
        role: 'agent',
      },
    },
  };
}

/**
 * Handles retrieving all customer bookings for the agent dashboard.
 * Requires authenticated agent credentials.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Object} authenticatedAgent
 * @returns {{ status: number, body: Object }}
 */
export function handleGetAgentBookings(db, authenticatedAgent) {
  if (!authenticatedAgent || authenticatedAgent.role !== 'agent') {
    return {
      status: 403,
      body: {
        success: false,
        message: 'Agent authentication required to access agent dashboard bookings.',
      },
    };
  }

  const bookings = getAllBookings(db);

  return {
    status: 200,
    body: {
      success: true,
      agent: {
        email: authenticatedAgent.email,
        fullName: authenticatedAgent.fullName || 'Voyara Travel Agent',
      },
      bookings,
      total: bookings.length,
    },
  };
}


