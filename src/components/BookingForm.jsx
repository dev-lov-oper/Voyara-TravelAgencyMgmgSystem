import React, { useState } from 'react';
import {
  isValidEmail,
  isValidPhone,
  isValidTravelerCount,
  isValidTravelDate,
  getTodayDateString,
} from '../utils/bookingValidation.js';
import { createBooking } from '../services/bookingService.js';

/**
 * BookingForm Component (TAMS-33 & TAMS-34)
 * Collects traveler contact and trip details for a selected travel package with
 * comprehensive client-side validation, server-side API integration, persistent database storage,
 * and duplicate submission prevention.
 *
 * @param {Object} props
 * @param {Object} [props.pkg] - Selected package object
 * @param {Function} props.onBack - Callback to return to the package details view
 * @param {Function} [props.onSubmit] - Optional callback or override for booking submission
 * @param {Object} [props.initialValues] - Initial form field values
 * @param {Object} [props.initialErrors] - Initial form validation errors
 * @param {Object|null} [props.initialSubmittedData] - Initial submitted confirmation data
 * @param {string|null} [props.initialServerError] - Initial server error message
 * @param {boolean} [props.initialIsSubmitting=false] - Initial in-flight submission state
 */
export default function BookingForm({
  pkg,
  onBack,
  onSubmit,
  onViewBookings,
  initialValues = {},
  initialErrors = {},
  initialSubmittedData = null,
  initialServerError = null,
  initialIsSubmitting = false,
}) {
  // Form input state
  const [formData, setFormData] = useState({
    fullName: initialValues.fullName || '',
    email: initialValues.email || '',
    phone: initialValues.phone || '',
    travelerCount: initialValues.travelerCount !== undefined ? String(initialValues.travelerCount) : '1',
    travelDate: initialValues.travelDate || '',
    additionalRequests: initialValues.additionalRequests || '',
  });

  // Validation error state
  const [errors, setErrors] = useState(initialErrors);

  // Server error state
  const [serverError, setServerError] = useState(initialServerError);

  // In-flight submission state (prevents duplicate submissions)
  const [isSubmitting, setIsSubmitting] = useState(initialIsSubmitting);

  // Submission / confirmation state
  const [submittedData, setSubmittedData] = useState(initialSubmittedData);

  const todayStr = getTodayDateString();

  // Package summary helpers with safe fallbacks
  const title = pkg?.title || 'Selected Travel Package';
  const destination = pkg?.destination || 'India';
  const durationText = pkg?.durationText || (pkg?.duration ? `${pkg.duration} days` : 'Flexible duration');
  const price = typeof pkg?.price === 'number' ? pkg.price : Number(pkg?.price) || 0;
  const formattedPrice = pkg?.formattedPrice || (price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Inquire for pricing');
  const category = pkg?.category || 'Curated Escape';

  // Calculate estimated total price
  const countNumber = Number(formData.travelerCount);
  const validCount = Number.isInteger(countNumber) && countNumber >= 1 ? countNumber : 1;
  const estimatedTotal = price > 0 ? price * validCount : 0;
  const formattedTotal = estimatedTotal > 0 ? `₹${estimatedTotal.toLocaleString('en-IN')}` : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error as the user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    // Clear server error banner upon edit
    if (serverError) {
      setServerError(null);
    }
  };

  const validate = () => {
    const newErrors = {};

    // 0. Selected Package (required)
    if (!pkg || !pkg.id) {
      newErrors.packageId = 'A valid travel package must be selected.';
    }

    // 1. Traveler Full Name (required)
    if (!formData.fullName || !formData.fullName.trim()) {
      newErrors.fullName = 'Traveler full name is required.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter a valid full name (at least 2 characters).';
    }

    // 2. Email Address (required, valid format)
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    // 3. Phone Number (required, valid format)
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (minimum 10 digits).';
    }

    // 4. Number of Travelers (required, positive integer >= 1)
    if (formData.travelerCount === '' || formData.travelerCount === undefined || formData.travelerCount === null) {
      newErrors.travelerCount = 'Number of travelers is required.';
    } else if (!isValidTravelerCount(formData.travelerCount)) {
      newErrors.travelerCount = 'Number of travelers must be a whole number of at least 1.';
    }

    // 5. Preferred Travel Date (required, cannot be in the past)
    if (!formData.travelDate || !formData.travelDate.trim()) {
      newErrors.travelDate = 'Preferred travel date is required.';
    } else if (!isValidTravelDate(formData.travelDate)) {
      newErrors.travelDate = 'Preferred travel date cannot be in the past.';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate accidental submissions while in-flight
    if (isSubmitting) {
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first erroneous field for accessibility
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(`booking-${firstErrorField}`);
      if (element) {
        element.focus();
      }
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    const payload = {
      packageId: pkg?.id || null,
      packageTitle: title,
      packageDestination: destination,
      packagePrice: price,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      travelerCount: Number(formData.travelerCount),
      travelDate: formData.travelDate,
      additionalRequests: formData.additionalRequests.trim(),
      estimatedTotal,
      submittedAt: new Date().toISOString(),
    };

    try {
      let createdBooking = null;

      // Allow parent custom handler or spy if provided
      if (typeof onSubmit === 'function') {
        const customResult = await onSubmit(payload);
        if (customResult && (customResult.booking || customResult.bookingReference)) {
          createdBooking = customResult.booking || customResult;
        }
      }

      // If not handled by custom return, send to backend API
      if (!createdBooking) {
        const response = await createBooking(payload);
        createdBooking = response.booking;
      }

      setSubmittedData(createdBooking);
    } catch (err) {
      const errorMsg = err.message || 'Unable to create booking request. Please check your details and try again.';
      setServerError(errorMsg);

      // If backend returned field-specific validation errors, display them on fields
      if (err.errors && typeof err.errors === 'object') {
        setErrors((prev) => ({ ...prev, ...err.errors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRequest = () => {
    setSubmittedData(null);
    setServerError(null);
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setServerError(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      travelerCount: '1',
      travelDate: '',
      additionalRequests: '',
    });
  };

  // Determine if submitted data represents a persisted backend booking with reference
  const isPersistedBooking = Boolean(submittedData && submittedData.bookingReference);

  return (
    <div className="booking-page" aria-labelledby="booking-page-title">
      <div className="section-container">
        
        {/* Navigation Breadcrumbs & Back Action */}
        <nav className="details-navigation" aria-label="Breadcrumb and back navigation">
          <button
            type="button"
            className="btn-back-link"
            onClick={onBack}
            id="back-to-details-link"
            aria-label="Return to package details"
            disabled={isSubmitting}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Package Details
          </button>

          <ol className="details-breadcrumbs">
            <li>
              <button type="button" className="crumb-btn" onClick={onBack} disabled={isSubmitting}>
                Home
              </button>
            </li>
            <li aria-hidden="true" className="crumb-sep">/</li>
            <li>
              <button type="button" className="crumb-btn" onClick={onBack} disabled={isSubmitting}>
                Packages
              </button>
            </li>
            <li aria-hidden="true" className="crumb-sep">/</li>
            <li>
              <button type="button" className="crumb-btn" onClick={onBack} disabled={isSubmitting}>
                {destination}
              </button>
            </li>
            <li aria-hidden="true" className="crumb-sep">/</li>
            <li aria-current="page" className="crumb-active">Booking Request</li>
          </ol>
        </nav>

        {/* Persisted Database-Confirmed Booking State (TAMS-34) */}
        {isPersistedBooking ? (
          <div className="booking-confirmation-card booking-success-confirmed" role="region" aria-labelledby="confirmed-heading">
            <div className="confirmation-badge-icon confirmation-badge-success" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 id="confirmed-heading" className="confirmation-title">
              Booking Request Confirmed!
            </h1>
            
            <p className="confirmation-lead">
              Your travel booking request has been successfully created and recorded in our database.
            </p>

            {/* Unique Booking Reference and Status Banner */}
            <div className="booking-reference-banner" role="status" aria-live="polite">
              <div className="ref-banner-col">
                <span className="ref-banner-label">Booking Reference</span>
                <span className="ref-banner-code" id="booking-reference-code">
                  {submittedData.bookingReference}
                </span>
              </div>
              <div className="ref-banner-divider" aria-hidden="true" />
              <div className="ref-banner-col">
                <span className="ref-banner-label">Initial Status</span>
                <span className="status-pill status-pending" id="booking-status-badge">
                  {submittedData.status || 'Pending'}
                </span>
              </div>
            </div>

            <div className="confirmation-note-box confirmation-note-success" role="note">
              <span className="note-box-icon" aria-hidden="true">✓</span>
              <p>
                <strong>Reservation Recorded:</strong> Keep your booking reference <strong>{submittedData.bookingReference}</strong> handy. Our travel specialists will verify package availability for <strong>{title}</strong> and contact you at <strong>{submittedData.email}</strong>. No payment is required until confirmation.
              </p>
            </div>

            {/* Summary of Saved Details */}
            <div className="confirmation-details-grid">
              <div className="conf-detail-item">
                <span className="conf-label">Selected Package</span>
                <span className="conf-value">{submittedData.packageTitle || title} ({submittedData.packageDestination || destination})</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Primary Traveler</span>
                <span className="conf-value">{submittedData.fullName}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Contact Email</span>
                <span className="conf-value">{submittedData.email}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Contact Phone</span>
                <span className="conf-value">{submittedData.phone}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Travel Date</span>
                <span className="conf-value">{submittedData.travelDate}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Number of Travelers</span>
                <span className="conf-value">{submittedData.travelerCount} {submittedData.travelerCount === 1 ? 'person' : 'people'}</span>
              </div>
              {(submittedData.totalPrice || submittedData.estimatedTotal || formattedTotal) && (
                <div className="conf-detail-item conf-total-item">
                  <span className="conf-label">Total Booking Amount</span>
                  <span className="conf-value conf-total-value">
                    {submittedData.formattedTotal 
                      ? submittedData.formattedTotal 
                      : (submittedData.totalPrice 
                          ? `₹${Number(submittedData.totalPrice).toLocaleString('en-IN')}` 
                          : formattedTotal)}
                  </span>
                </div>
              )}
              {submittedData.additionalRequests && (
                <div className="conf-detail-item conf-full-width">
                  <span className="conf-label">Special Requests</span>
                  <span className="conf-value conf-multiline">{submittedData.additionalRequests}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="confirmation-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetForm}
                id="book-another-btn"
              >
                + Book Another Trip
              </button>
              {onViewBookings && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onViewBookings}
                  id="view-status-btn"
                >
                  View Booking Status →
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={onBack}
                id="return-to-details-btn"
              >
                ← Return to Package Details
              </button>
            </div>

          </div>
        ) : submittedData ? (
          /* Client-Side Validation Preparation View (TAMS-33 compatibility) */
          <div className="booking-confirmation-card" role="region" aria-labelledby="confirmation-heading">
            <div className="confirmation-badge-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 id="confirmation-heading" className="confirmation-title">
              Booking Request Prepared
            </h1>
            
            <p className="confirmation-lead">
              Client-side validation passed. Your travel details are ready for backend submission.
            </p>

            <div className="confirmation-note-box" role="note">
              <span className="note-box-icon" aria-hidden="true">ℹ️</span>
              <p>
                <strong>System Notice:</strong> Form validation complete. Database booking creation and reservation confirmation will be connected in <strong>TAMS-34</strong>.
              </p>
            </div>

            {/* Summary of Entered Details */}
            <div className="confirmation-details-grid">
              <div className="conf-detail-item">
                <span className="conf-label">Selected Package</span>
                <span className="conf-value">{title} ({destination})</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Primary Traveler</span>
                <span className="conf-value">{submittedData.fullName}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Contact Email</span>
                <span className="conf-value">{submittedData.email}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Contact Phone</span>
                <span className="conf-value">{submittedData.phone}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Travel Date</span>
                <span className="conf-value">{submittedData.travelDate}</span>
              </div>
              <div className="conf-detail-item">
                <span className="conf-label">Number of Travelers</span>
                <span className="conf-value">{submittedData.travelerCount} {submittedData.travelerCount === 1 ? 'person' : 'people'}</span>
              </div>
              {(submittedData.estimatedTotal || formattedTotal) && (
                <div className="conf-detail-item conf-total-item">
                  <span className="conf-label">Estimated Total</span>
                  <span className="conf-value conf-total-value">
                    {submittedData.estimatedTotal 
                      ? `₹${Number(submittedData.estimatedTotal).toLocaleString('en-IN')}` 
                      : formattedTotal}
                  </span>
                </div>
              )}
              {submittedData.additionalRequests && (
                <div className="conf-detail-item conf-full-width">
                  <span className="conf-label">Special Requests</span>
                  <span className="conf-value conf-multiline">{submittedData.additionalRequests}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="confirmation-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleEditRequest}
                id="edit-booking-btn"
              >
                ✏️ Edit Booking Details
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onBack}
                id="return-to-details-btn"
              >
                ← Return to Package Details
              </button>
            </div>
          </div>
        ) : (
          /* Main Two-Column Booking Layout: Left = Form, Right = Package Summary */
          <div className="booking-layout-grid">
            
            {/* Form Column */}
            <div className="booking-form-column">
              <div className="booking-form-card">
                
                <header className="booking-form-header">
                  <span className="booking-step-badge">Step 1 of 2</span>
                  <h1 id="booking-page-title" className="booking-form-title">
                    Book Your Travel Package
                  </h1>
                  <p className="booking-form-subtitle">
                    Please provide your contact information and travel dates. Our travel specialists will review your request.
                  </p>
                </header>

                {/* Global Server / Network Error Alert */}
                {(serverError || errors.packageId) && (
                  <div className="form-server-error-banner" role="alert" id="booking-server-error">
                    <div className="server-error-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="server-error-content">
                      <strong className="server-error-title">Submission Unsuccessful</strong>
                      <p className="server-error-message">{serverError || errors.packageId}</p>
                    </div>
                  </div>
                )}

                <form className="booking-form" onSubmit={handleSubmit} noValidate aria-label="Travel package booking form">
                  
                  {/* Field 1: Traveler Full Name */}
                  <div className="form-group">
                    <label htmlFor="booking-fullName" className="form-label">
                      Traveler Full Name <span className="required-star" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="text"
                      id="booking-fullName"
                      name="fullName"
                      className={`form-input ${errors.fullName ? 'is-invalid' : ''}`}
                      placeholder="e.g. Sharvan Kumar"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      aria-required="true"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'error-fullName' : undefined}
                      disabled={isSubmitting}
                    />
                    {errors.fullName && (
                      <p id="error-fullName" className="form-error-msg" role="alert">
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* 2-Column Contact Row: Email & Phone */}
                  <div className="form-row-2col">
                    {/* Field 2: Email Address */}
                    <div className="form-group">
                      <label htmlFor="booking-email" className="form-label">
                        Email Address <span className="required-star" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="email"
                        id="booking-email"
                        name="email"
                        className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="e.g. traveler@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        aria-required="true"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'error-email' : undefined}
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p id="error-email" className="form-error-msg" role="alert">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Field 3: Phone Number */}
                    <div className="form-group">
                      <label htmlFor="booking-phone" className="form-label">
                        Phone Number <span className="required-star" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="tel"
                        id="booking-phone"
                        name="phone"
                        className={`form-input ${errors.phone ? 'is-invalid' : ''}`}
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        autoComplete="tel"
                        aria-required="true"
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'error-phone' : undefined}
                        disabled={isSubmitting}
                      />
                      {errors.phone && (
                        <p id="error-phone" className="form-error-msg" role="alert">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Travel Details Row: Travelers Count & Preferred Date */}
                  <div className="form-row-2col">
                    {/* Field 4: Number of Travelers */}
                    <div className="form-group">
                      <label htmlFor="booking-travelerCount" className="form-label">
                        Number of Travelers <span className="required-star" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="number"
                        id="booking-travelerCount"
                        name="travelerCount"
                        min="1"
                        step="1"
                        className={`form-input ${errors.travelerCount ? 'is-invalid' : ''}`}
                        placeholder="1"
                        value={formData.travelerCount}
                        onChange={handleChange}
                        required
                        aria-required="true"
                        aria-invalid={Boolean(errors.travelerCount)}
                        aria-describedby={errors.travelerCount ? 'error-travelerCount' : undefined}
                        disabled={isSubmitting}
                      />
                      {errors.travelerCount && (
                        <p id="error-travelerCount" className="form-error-msg" role="alert">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.travelerCount}
                        </p>
                      )}
                    </div>

                    {/* Field 5: Preferred Travel Date */}
                    <div className="form-group">
                      <label htmlFor="booking-travelDate" className="form-label">
                        Preferred Travel Date <span className="required-star" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="date"
                        id="booking-travelDate"
                        name="travelDate"
                        min={todayStr}
                        className={`form-input ${errors.travelDate ? 'is-invalid' : ''}`}
                        value={formData.travelDate}
                        onChange={handleChange}
                        required
                        aria-required="true"
                        aria-invalid={Boolean(errors.travelDate)}
                        aria-describedby={errors.travelDate ? 'error-travelDate' : undefined}
                        disabled={isSubmitting}
                      />
                      {errors.travelDate && (
                        <p id="error-travelDate" className="form-error-msg" role="alert">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.travelDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Field 6: Additional Requests (Optional multiline text) */}
                  <div className="form-group">
                    <div className="form-label-with-hint">
                      <label htmlFor="booking-additionalRequests" className="form-label">
                        Additional Requests
                      </label>
                      <span className="form-optional-tag">Optional</span>
                    </div>
                    <textarea
                      id="booking-additionalRequests"
                      name="additionalRequests"
                      rows="4"
                      className="form-textarea"
                      placeholder="Share dietary preferences, room arrangements, special occasions, or mobility requirements..."
                      value={formData.additionalRequests}
                      onChange={handleChange}
                      aria-describedby="additional-requests-hint"
                      disabled={isSubmitting}
                    />
                    <p id="additional-requests-hint" className="form-hint-text">
                      We'll do our best to accommodate special requests with our local partners.
                    </p>
                  </div>

                  {/* Form Submission Actions */}
                  <div className="booking-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary btn-submit-booking"
                      id="submit-booking-btn"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-indicator" aria-hidden="true" />
                          <span>Submitting Booking Request...</span>
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                    {onBack && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={onBack}
                        id="cancel-booking-btn"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </form>
              </div>
            </div>

            {/* Selected Package Summary Column */}
            <aside className="booking-summary-column" aria-label="Selected package summary">
              <div className="booking-summary-card">
                
                <h2 className="summary-card-title">
                  Trip Summary
                </h2>

                {/* Package Thumbnail & Destination */}
                {pkg?.imageUrl && (
                  <div className="summary-media">
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.imageAlt || `${title} in ${destination}`}
                      className="summary-image"
                    />
                    <span className="summary-destination-badge">
                      {destination}
                    </span>
                  </div>
                )}

                <div className="summary-info-group">
                  <h3 className="summary-package-title">{title}</h3>
                  <p className="summary-destination-line">
                    <strong>{destination}</strong>, India
                  </p>
                </div>

                <div className="summary-spec-list">
                  <div className="summary-spec-row">
                    <span className="spec-row-label">Duration</span>
                    <span className="spec-row-value">{durationText}</span>
                  </div>
                  <div className="summary-spec-row">
                    <span className="spec-row-label">Category</span>
                    <span className="spec-row-value">{category}</span>
                  </div>
                  <div className="summary-spec-row">
                    <span className="spec-row-label">Price Per Person</span>
                    <span className="spec-row-value price-text">{formattedPrice}</span>
                  </div>
                  <div className="summary-spec-row">
                    <span className="spec-row-label">Travelers</span>
                    <span className="spec-row-value">{validCount} {validCount === 1 ? 'person' : 'people'}</span>
                  </div>
                </div>

                {/* Price Breakdown / Total Estimate */}
                {formattedTotal && (
                  <div className="summary-total-box">
                    <div className="total-row">
                      <span className="total-label">Estimated Total</span>
                      <span className="total-amount">{formattedTotal}</span>
                    </div>
                    <span className="total-subtext">
                      ₹{price.toLocaleString('en-IN')} × {validCount} traveler{validCount > 1 ? 's' : ''} (taxes included)
                    </span>
                  </div>
                )}

                <div className="summary-guarantee-note">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  <span>No payment required right now. You can review details before finalizing.</span>
                </div>

                <div className="summary-back-action">
                  <button
                    type="button"
                    className="btn btn-secondary btn-full-width"
                    onClick={onBack}
                    disabled={isSubmitting}
                  >
                    ← Back to Package Details
                  </button>
                </div>

              </div>
            </aside>

          </div>
        )}

      </div>
    </div>
  );
}
