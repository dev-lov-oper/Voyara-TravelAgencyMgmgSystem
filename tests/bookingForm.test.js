import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BookingForm from '../src/components/BookingForm.jsx';
import PackageDetails from '../src/components/PackageDetails.jsx';
import App from '../src/App.jsx';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';
import {
  isValidEmail,
  isValidPhone,
  isValidTravelerCount,
  isValidTravelDate,
  getTodayDateString,
} from '../src/utils/bookingValidation.js';

describe('TAMS-33: Booking Form Validation Utilities', () => {

  describe('Email Validation (isValidEmail)', () => {
    it('accepts standard valid email addresses', () => {
      expect(isValidEmail('traveler@example.com')).toBe(true);
      expect(isValidEmail('sharvan.kumar@domain.co.in')).toBe(true);
      expect(isValidEmail('booking+voyara@sub.agency.org')).toBe(true);
      expect(isValidEmail('user123@voyara.travel')).toBe(true);
    });

    it('rejects invalid or malformed email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('missingdomain@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('spaces in email@domain.com')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe('Phone Validation (isValidPhone)', () => {
    it('accepts valid 10 to 15 digit telephone numbers with standard formatting', () => {
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('+91 98765 43210')).toBe(true);
      expect(isValidPhone('+91-9876543210')).toBe(true);
      expect(isValidPhone('09876543210')).toBe(true);
      expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
      expect(isValidPhone('919876543210')).toBe(true);
    });

    it('rejects invalid, letters, or too short/long phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('12345')).toBe(false); // too short (<10 digits)
      expect(isValidPhone('987654321')).toBe(false); // 9 digits
      expect(isValidPhone('phone1234567890')).toBe(false); // letters
      expect(isValidPhone('abcdefghijk')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone('12345678901234567890')).toBe(false); // too long (>15 digits)
    });
  });

  describe('Traveler Count Validation (isValidTravelerCount)', () => {
    it('accepts positive whole integers (>= 1)', () => {
      expect(isValidTravelerCount(1)).toBe(true);
      expect(isValidTravelerCount(2)).toBe(true);
      expect(isValidTravelerCount(10)).toBe(true);
      expect(isValidTravelerCount('1')).toBe(true);
      expect(isValidTravelerCount('5')).toBe(true);
    });

    it('rejects zero, negative numbers, decimals, or non-numeric values', () => {
      expect(isValidTravelerCount(0)).toBe(false);
      expect(isValidTravelerCount(-1)).toBe(false);
      expect(isValidTravelerCount(1.5)).toBe(false);
      expect(isValidTravelerCount('2.3')).toBe(false);
      expect(isValidTravelerCount('abc')).toBe(false);
      expect(isValidTravelerCount('')).toBe(false);
      expect(isValidTravelerCount(null)).toBe(false);
      expect(isValidTravelerCount(undefined)).toBe(false);
    });
  });

  describe('Travel Date Validation (isValidTravelDate)', () => {
    it('accepts today or future dates', () => {
      const today = getTodayDateString();
      expect(isValidTravelDate(today)).toBe(true);

      const futureDate = '2030-12-31';
      expect(isValidTravelDate(futureDate)).toBe(true);
    });

    it('rejects dates in the past', () => {
      expect(isValidTravelDate('2020-01-01')).toBe(false);
      expect(isValidTravelDate('2023-05-15')).toBe(false);
    });

    it('rejects invalid or empty date strings', () => {
      expect(isValidTravelDate('')).toBe(false);
      expect(isValidTravelDate('invalid-date')).toBe(false);
      expect(isValidTravelDate(null)).toBe(false);
      expect(isValidTravelDate(undefined)).toBe(false);
    });
  });

});

describe('TAMS-33: Booking Form Component Rendering & Fields', () => {

  const sampleGoa = SAMPLE_PACKAGES.find(p => p.id === 'pkg-1');
  const sampleManali = SAMPLE_PACKAGES.find(p => p.id === 'pkg-2');

  it('1. Renders all 6 required and optional booking fields with appropriate labels and inputs', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: sampleGoa, onBack: () => {} })
    );

    // 1. Traveler Full Name (required)
    expect(html).toContain('for="booking-fullName"');
    expect(html).toContain('Traveler Full Name');
    expect(html).toContain('id="booking-fullName"');
    expect(html).toContain('name="fullName"');

    // 2. Email Address (required)
    expect(html).toContain('for="booking-email"');
    expect(html).toContain('Email Address');
    expect(html).toContain('id="booking-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');

    // 3. Phone Number (required)
    expect(html).toContain('for="booking-phone"');
    expect(html).toContain('Phone Number');
    expect(html).toContain('id="booking-phone"');
    expect(html).toContain('name="phone"');
    expect(html).toContain('type="tel"');

    // 4. Number of Travelers (required, min 1)
    expect(html).toContain('for="booking-travelerCount"');
    expect(html).toContain('Number of Travelers');
    expect(html).toContain('id="booking-travelerCount"');
    expect(html).toContain('name="travelerCount"');
    expect(html).toContain('min="1"');
    expect(html).toContain('step="1"');

    // 5. Preferred Travel Date (required)
    expect(html).toContain('for="booking-travelDate"');
    expect(html).toContain('Preferred Travel Date');
    expect(html).toContain('id="booking-travelDate"');
    expect(html).toContain('name="travelDate"');
    expect(html).toContain('type="date"');

    // 6. Additional Requests (optional multiline)
    expect(html).toContain('for="booking-additionalRequests"');
    expect(html).toContain('Additional Requests');
    expect(html).toContain('Optional');
    expect(html).toContain('id="booking-additionalRequests"');
    expect(html).toContain('name="additionalRequests"');
    expect(html).toContain('<textarea');
  });

  it('2. Renders clearly labelled "Submit Booking Request" button', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('Submit Booking Request');
    expect(html).toContain('id="submit-booking-btn"');
    expect(html).toContain('type="submit"');
  });

  it('3. Renders selected package summary (name, destination, duration, price, and category)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('Trip Summary');
    expect(html).toContain('Coastal Escape');
    expect(html).toContain('Goa');
    expect(html).toContain('4 days');
    expect(html).toContain('₹12,999');
    expect(html).toContain('Beach &amp; Leisure');
    expect(html).toContain('Estimated Total');
  });

  it('4. Correctly associates different selected package summaries (e.g. Manali)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: sampleManali, onBack: () => {} })
    );

    expect(html).toContain('Himalayan Retreat');
    expect(html).toContain('Manali');
    expect(html).toContain('5 days');
    expect(html).toContain('₹18,499');
    expect(html).toContain('Mountains &amp; Adventure');
    expect(html).not.toContain('Coastal Escape');
  });

  it('5. Handles missing or null package data gracefully with safe fallbacks', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: null, onBack: () => {} })
    );

    expect(html).toContain('Selected Travel Package');
    expect(html).toContain('India');
    expect(html).toContain('Flexible duration');
    expect(html).toContain('Submit Booking Request');
  });

  it('6. Renders clear return navigation back to package details view', () => {
    const html = renderToStaticMarkup(
      React.createElement(BookingForm, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('id="back-to-details-link"');
    expect(html).toContain('Back to Package Details');
    expect(html).toContain('id="cancel-booking-btn"');
    expect(html).toContain('Cancel');
    expect(html).toContain('class="details-breadcrumbs"');
  });

});

describe('TAMS-33: Package Details and Booking Navigation Integration', () => {

  const sampleGoa = SAMPLE_PACKAGES.find(p => p.id === 'pkg-1');

  it('1. PackageDetails renders "Book This Package" button when onBook callback is provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, {
        pkg: sampleGoa,
        onBack: () => {},
        onBook: () => {},
      })
    );

    expect(html).toContain('id="book-package-btn"');
    expect(html).toContain('Book This Package');
    expect(html).toContain('btn-primary');
  });

  it('2. App component renders package listing by default when no package or booking is active', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    expect(html).toContain('Explore Travel Packages');
    expect(html).not.toContain('booking-form-card');
  });

});

describe('TAMS-33: Form Validation Display and Error States', () => {

  const sampleGoa = SAMPLE_PACKAGES.find(p => p.id === 'pkg-1');

  it('1. Displays clear validation messages and accessible invalid states for required fields', () => {
    const errors = {
      fullName: 'Traveler full name is required.',
      email: 'Email address is required.',
      phone: 'Phone number is required.',
      travelerCount: 'Number of travelers is required.',
      travelDate: 'Preferred travel date is required.',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialErrors: errors,
      })
    );

    // Error messages with role="alert"
    expect(html).toContain('Traveler full name is required.');
    expect(html).toContain('Email address is required.');
    expect(html).toContain('Phone number is required.');
    expect(html).toContain('Number of travelers is required.');
    expect(html).toContain('Preferred travel date is required.');

    // Inputs marked with aria-invalid="true" and is-invalid class
    expect(html).toContain('id="booking-fullName"');
    expect(html).toContain('id="booking-email"');
    expect(html).toContain('id="booking-phone"');
    expect(html).toContain('id="booking-travelerCount"');
    expect(html).toContain('id="booking-travelDate"');
    expect(html).toContain('class="form-input is-invalid"');
    expect(html).toContain('aria-invalid="true"');
  });

  it('2. Displays format-specific error message for invalid email and phone numbers', () => {
    const errors = {
      email: 'Please enter a valid email address (e.g. name@example.com).',
      phone: 'Please enter a valid phone number (minimum 10 digits).',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialValues: {
          email: 'invalid-email',
          phone: '12345',
        },
        initialErrors: errors,
      })
    );

    expect(html).toContain('Please enter a valid email address (e.g. name@example.com).');
    expect(html).toContain('Please enter a valid phone number (minimum 10 digits).');
    // Values are preserved in inputs
    expect(html).toContain('value="invalid-email"');
    expect(html).toContain('value="12345"');
  });

  it('3. Displays past-date error and invalid traveler count error', () => {
    const errors = {
      travelDate: 'Preferred travel date cannot be in the past.',
      travelerCount: 'Number of travelers must be a whole number of at least 1.',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialValues: {
          travelDate: '2020-01-01',
          travelerCount: '0',
        },
        initialErrors: errors,
      })
    );

    expect(html).toContain('Preferred travel date cannot be in the past.');
    expect(html).toContain('Number of travelers must be a whole number of at least 1.');
    expect(html).toContain('value="2020-01-01"');
    expect(html).toContain('value="0"');
  });

  it('4. Preserves entered values and optional additional requests when validation errors occur', () => {
    const values = {
      fullName: 'Sharvan Kumar',
      email: 'bad-email',
      phone: '+91 98765 43210',
      travelerCount: '3',
      travelDate: '2027-02-15',
      additionalRequests: 'Vegetarian meals and quiet room on ground floor',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialValues: values,
        initialErrors: { email: 'Please enter a valid email address.' },
      })
    );

    expect(html).toContain('value="Sharvan Kumar"');
    expect(html).toContain('value="bad-email"');
    expect(html).toContain('value="+91 98765 43210"');
    expect(html).toContain('value="3"');
    expect(html).toContain('value="2027-02-15"');
    expect(html).toContain('Vegetarian meals and quiet room on ground floor');
  });

});

describe('TAMS-33: Booking Confirmation and Submission Ready State', () => {

  const sampleGoa = SAMPLE_PACKAGES.find(p => p.id === 'pkg-1');

  it('1. Renders clean confirmation view when client-side validation passes', () => {
    const submittedData = {
      packageId: 'pkg-1',
      packageTitle: 'Coastal Escape',
      packageDestination: 'Goa',
      packagePrice: 12999,
      fullName: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+91 98765 43210',
      travelerCount: 2,
      travelDate: '2027-04-10',
      additionalRequests: 'Window seat preference',
      estimatedTotal: 25998,
      submittedAt: '2026-10-19T10:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(BookingForm, {
        pkg: sampleGoa,
        onBack: () => {},
        initialSubmittedData: submittedData,
      })
    );

    // Confirmation header & notice
    expect(html).toContain('Booking Request Prepared');
    expect(html).toContain('Client-side validation passed. Your travel details are ready for backend submission.');
    expect(html).toContain('Database booking creation and reservation confirmation will be connected in');
    expect(html).toContain('TAMS-34');

    // Submitted details summary
    expect(html).toContain('Aarav Sharma');
    expect(html).toContain('aarav@example.com');
    expect(html).toContain('+91 98765 43210');
    expect(html).toContain('2027-04-10');
    expect(html).toContain('2 people');
    expect(html).toContain('₹25,998');
    expect(html).toContain('Window seat preference');

    // Navigation and editing actions
    expect(html).toContain('id="edit-booking-btn"');
    expect(html).toContain('Edit Booking Details');
    expect(html).toContain('id="return-to-details-btn"');
    expect(html).toContain('Return to Package Details');
  });

});

