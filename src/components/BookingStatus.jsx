import React, { useState, useEffect } from 'react';
import { getAllBookings } from '../services/bookingService.js';
import {
  getStoredCustomerToken,
  getStoredCustomerInfo,
  clearStoredCustomerSession,
  loginCustomer,
} from '../services/authService.js';
import { formatBookingDate, getStatusClass } from '../utils/bookingStatusUtils.js';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

/**
 * BookingStatus Component (TAMS-36 & TAMS-37)
 * Displays authenticated customer booking records with reference, travel package name,
 * booking date, traveler count, and live booking status badge.
 * Includes loading, empty-bookings, unauthenticated, and error states.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.bookings] - Optional initial/injected bookings list (for testing or SSR)
 * @param {boolean} [props.isLoading] - Optional controlled loading state
 * @param {string|null} [props.error] - Optional controlled error message
 * @param {string} [props.authToken] - Optional explicit auth token override
 * @param {Object} [props.customer] - Optional customer profile override
 * @param {Function} [props.onRetry] - Optional retry callback
 * @param {Function} [props.onExplorePackages] - Callback to return to package exploration
 * @param {Function} [props.onViewPackage] - Callback to view details of a package
 * @param {string} [props.initialSearchQuery=''] - Initial search filter
 * @param {string} [props.initialStatusFilter='All'] - Initial status filter ('All', 'Pending', 'Confirmed', 'Rejected')
 */
export default function BookingStatus({
  bookings: propBookings,
  isLoading: propIsLoading,
  error: propError,
  authToken: propAuthToken,
  customer: propCustomer,
  onRetry: propOnRetry,
  onExplorePackages,
  onViewPackage,
  initialSearchQuery = '',
  initialStatusFilter = 'All',
}) {
  const initialToken = propAuthToken || (typeof window !== 'undefined' ? getStoredCustomerToken() : null);
  const isControlled = propBookings !== undefined;

  const [internalBookings, setInternalBookings] = useState([]);
  const [internalLoading, setInternalLoading] = useState(() => {
    if (isControlled) return false;
    return Boolean(initialToken);
  });
  const [internalError, setInternalError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Authentication state
  const [isUnauthenticated, setIsUnauthenticated] = useState(() => {
    if (isControlled) return false;
    return !initialToken;
  });
  const [authError, setAuthError] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(() => propCustomer || getStoredCustomerInfo());

  // Search and status filter state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [copiedRef, setCopiedRef] = useState(null);

  // Effective state values (prop overrides internal if provided)
  const bookingsList = isControlled ? propBookings : internalBookings;
  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;
  const error = propError !== undefined ? propError : internalError;
  const effectiveCustomer = propCustomer || currentCustomer;

  // Fetch bookings on mount or when fetchKey increments (if not controlled)
  useEffect(() => {
    if (isControlled) return;

    const token = propAuthToken || getStoredCustomerToken();
    if (!token) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();


    getAllBookings({ token, signal: controller.signal })
      .then((data) => {
        if (!ignore) {
          setInternalBookings(Array.isArray(data) ? data : []);
          setInternalLoading(false);
          setInternalError(null);
          setIsUnauthenticated(false);
        }
      })
      .catch((err) => {
        if (!ignore && err.name !== 'AbortError') {
          if (err.status === 401) {
            setIsUnauthenticated(true);
            setInternalBookings([]);
            setAuthError(err.message || 'Authentication required to access booking records.');
          } else {
            setInternalError(err.message || 'Unable to load booking records. Please check your connection.');
          }
          setInternalLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [fetchKey, isControlled, propAuthToken]);

  const handleRetry = () => {
    if (propOnRetry) {
      propOnRetry();
    } else {
      setInternalLoading(true);
      setInternalError(null);
      setFetchKey((prev) => prev + 1);
    }
  };

  const handleCustomerLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = authEmail.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your email address.');
      return;
    }

    const cleanPassword = authPassword.trim();
    if (!cleanPassword) {
      setAuthError('Please enter your account password (default: voyara123).');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await loginCustomer({
        email: cleanEmail,
        password: cleanPassword,
      });

      setCurrentCustomer(response.customer);
      setIsUnauthenticated(false);
      setFetchKey((k) => k + 1);
    } catch (err) {
      setAuthError(err.message || 'Customer authentication failed. Please verify your email and password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = () => {
    clearStoredCustomerSession();
    setCurrentCustomer(null);
    setInternalBookings([]);
    setIsUnauthenticated(true);
    setAuthEmail('');
    setAuthPassword('');
    setAuthError(null);
  };

  const handleQuickDemoCustomer = async (demoEmail, demoPassword = 'voyara123') => {
    setAuthEmail(demoEmail);
    setAuthPassword(demoPassword);
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await loginCustomer({ email: demoEmail, password: demoPassword });
      setCurrentCustomer(response.customer);
      setIsUnauthenticated(false);
      setFetchKey((k) => k + 1);
    } catch (err) {
      setAuthError(err.message || 'Quick login failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCopyReference = (ref) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(ref).catch(() => {});
    }
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef((curr) => (curr === ref ? null : curr));
    }, 2500);
  };

  // Filter bookings by search query (reference, package title, traveler name) & status
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredBookings = bookingsList.filter((booking) => {
    // 1. Status Filter
    if (statusFilter !== 'All') {
      const bStatus = (booking.status || 'Pending').toLowerCase();
      if (bStatus !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Search Query Filter
    if (normalizedQuery) {
      const refMatch = (booking.bookingReference || '').toLowerCase().includes(normalizedQuery);
      const pkgMatch = (booking.packageTitle || booking.title || '').toLowerCase().includes(normalizedQuery);
      const nameMatch = (booking.fullName || '').toLowerCase().includes(normalizedQuery);
      const destMatch = (booking.packageDestination || '').toLowerCase().includes(normalizedQuery);

      if (!refMatch && !pkgMatch && !nameMatch && !destMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate status counts for filter badges
  const totalCount = bookingsList.length;
  const pendingCount = bookingsList.filter((b) => (b.status || '').toLowerCase() === 'pending').length;
  const confirmedCount = bookingsList.filter((b) => (b.status || '').toLowerCase() === 'confirmed').length;
  const rejectedCount = bookingsList.filter((b) => (b.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="booking-status-page" role="region" aria-labelledby="booking-status-heading">
      <div className="booking-status-container">
        {/* Navigation Breadcrumb / Header */}
        <div className="booking-status-header">
          <div className="booking-status-header-content">
            {onExplorePackages && (
              <button
                type="button"
                className="btn-back-link"
                onClick={onExplorePackages}
                id="btn-back-to-explore"
                aria-label="Back to package catalog"
              >
                ← Back to Packages
              </button>
            )}
            <h1 id="booking-status-heading" className="booking-status-title">
              My Travel Bookings
            </h1>
            <p className="booking-status-subtitle">
              View and track the confirmation status of your submitted travel reservations and departure dates.
            </p>
          </div>

          <div className="booking-status-header-actions">
            {!isUnauthenticated && (
              <button
                type="button"
                className="btn btn-outline btn-sm btn-refresh-bookings"
                onClick={handleRetry}
                id="refresh-bookings-btn"
                title="Refresh bookings list from database"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Customer Session Profile Bar (when authenticated) */}
        {effectiveCustomer && !isUnauthenticated && (
          <div className="booking-customer-session-bar" id="customer-session-bar">
            <div className="customer-session-identity">
              <span className="customer-avatar-badge" aria-hidden="true">👤</span>
              <div className="customer-text-wrap">
                <span className="customer-signed-label">Signed in as:</span>
                <strong className="customer-display-name">
                  {effectiveCustomer.fullName ? `${effectiveCustomer.fullName} ` : ''}
                  <span className="customer-display-email">({effectiveCustomer.email})</span>
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="btn-switch-customer"
              onClick={handleSignOut}
              id="btn-switch-customer"
              title="Sign out or switch customer account"
            >
              Sign Out / Switch Customer
            </button>
          </div>
        )}

        {/* Dynamic State Section */}
        {isLoading ? (
          /* 1. Loading State */
          <div
            className="booking-status-loading-grid"
            aria-busy="true"
            aria-label="Loading your bookings"
            id="bookings-loading-state"
          >
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="booking-card skeleton-card">
                <div className="booking-card-top skeleton-shimmer">
                  <div className="skeleton-line skeleton-title" style={{ width: '40%' }} />
                  <div className="skeleton-line skeleton-category" style={{ width: '25%' }} />
                </div>
                <div className="booking-card-content">
                  <div className="skeleton-line skeleton-title" style={{ width: '70%', height: '24px' }} />
                  <div className="skeleton-line skeleton-desc" style={{ width: '90%' }} />
                  <div className="skeleton-line skeleton-desc-short" style={{ width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : !isControlled && isUnauthenticated ? (
          /* 2. Unauthenticated State (Customer Login Prompt) */
          <div className="customer-auth-container" id="customer-auth-required-view">
            <div className="customer-auth-card">
              <div className="customer-auth-icon-wrap" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 className="customer-auth-title" id="auth-prompt-heading">Customer Authentication Required</h2>
              <p className="customer-auth-subtitle">
                Enter your registered booking email address and password to sign in and view your personal travel reservations.
              </p>

              {authError && (
                <div className="customer-auth-error-alert" role="alert" id="customer-auth-error">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleCustomerLoginSubmit} className="customer-auth-form" noValidate>
                <div className="auth-form-group">
                  <label htmlFor="customer-auth-email" className="auth-field-label">
                    Email Address <span className="field-required">*</span>
                  </label>
                  <input
                    id="customer-auth-email"
                    type="email"
                    className="auth-input"
                    placeholder="e.g. name@example.com"
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="customer-auth-password" className="auth-field-label">
                    Password <span className="field-required">*</span>
                  </label>
                  <input
                    id="customer-auth-password"
                    type="password"
                    className="auth-input"
                    placeholder="Enter your password (e.g. voyara123)"
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-auth-submit"
                  id="btn-customer-login-submit"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? 'Verifying Credentials...' : 'Sign In to View Bookings'}
                </button>
              </form>

              <div className="customer-auth-demo-section">
                <span className="demo-label">Quick Sign-In (Demo Records):</span>
                <div className="demo-pills-wrap">
                  <button
                    type="button"
                    className="btn-demo-customer-pill"
                    onClick={() => handleQuickDemoCustomer('ksharvan2007@gmail.com', 'voyara123')}
                    id="btn-demo-customer-1"
                  >
                    Sharvan Kotharu (voyara123)
                  </button>
                  <button
                    type="button"
                    className="btn-demo-customer-pill"
                    onClick={() => handleQuickDemoCustomer('livetest@voyara.com', 'voyara123')}
                    id="btn-demo-customer-2"
                  >
                    Live Test User (voyara123)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          /* 3. Error State */
          <div id="bookings-error-state">
            <ErrorState
              message={typeof error === 'string' ? error : 'An error occurred while loading your booking status records.'}
              onRetry={handleRetry}
            />
          </div>
        ) : totalCount === 0 ? (
          /* 4. Empty Bookings State (No bookings for this customer) */
          <div id="bookings-empty-state">
            <EmptyState
              title="No bookings found"
              subtitle={
                effectiveCustomer?.email
                  ? `You haven't submitted any travel bookings under ${effectiveCustomer.email} yet. Explore our curated itineraries and reserve your next adventure.`
                  : "You haven't submitted any travel bookings yet. Explore our curated itineraries and reserve your next adventure."
              }
              buttonText="Explore Packages"
              icon={
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M9 16l2 2 4-4" />
                </svg>
              }
              onReset={onExplorePackages || (() => {})}
            />
          </div>
        ) : (
          /* 5. Bookings List & Toolbar */
          <>
            <div className="booking-status-toolbar" role="search" aria-label="Filter bookings">
              <div className="booking-status-search-wrap">
                <span className="search-icon-adornment" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="booking-status-search-input"
                  id="booking-search-input"
                  placeholder="Search by reference (e.g. BK-2026), package, or traveler..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search bookings by reference, package, or traveler"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="booking-status-filter-pills" role="tablist" aria-label="Filter bookings by status">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'All'}
                  className={`booking-filter-pill ${statusFilter === 'All' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('All')}
                  id="filter-status-all"
                >
                  All <span className="pill-count">({totalCount})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'Pending'}
                  className={`booking-filter-pill ${statusFilter === 'Pending' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('Pending')}
                  id="filter-status-pending"
                >
                  Pending <span className="pill-count">({pendingCount})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'Confirmed'}
                  className={`booking-filter-pill ${statusFilter === 'Confirmed' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('Confirmed')}
                  id="filter-status-confirmed"
                >
                  Confirmed <span className="pill-count">({confirmedCount})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'Rejected'}
                  className={`booking-filter-pill ${statusFilter === 'Rejected' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('Rejected')}
                  id="filter-status-rejected"
                >
                  Rejected <span className="pill-count">({rejectedCount})</span>
                </button>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div id="bookings-filter-empty-state">
                <EmptyState
                  title="No matching bookings found"
                  subtitle={`We could not find any booking records matching "${searchQuery}" with status "${statusFilter}". Try adjusting or resetting your filter.`}
                  buttonText="Reset Filters"
                  onReset={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                />
              </div>
            ) : (
              <div className="bookings-list" id="bookings-list" role="feed" aria-busy="false">
                {filteredBookings.map((booking) => {
                  const status = booking.status || 'Pending';
                  const statusClass = getStatusClass(status);
                  const packageTitle = booking.packageTitle || booking.title || booking.packageId || 'Curated Escape';
                  const destination = booking.packageDestination || booking.destination || null;
                  const formattedBookingDate = formatBookingDate(booking.createdAt);
                  const travelerCount = Number(booking.travelerCount) || 1;
                  const formattedPrice = booking.formattedTotal || (booking.totalPrice ? `₹${Number(booking.totalPrice).toLocaleString('en-IN')}` : null);

                  return (
                    <article
                      key={booking.bookingReference || booking.id}
                      className="booking-status-card"
                      id={`booking-card-${booking.bookingReference}`}
                      aria-labelledby={`booking-ref-${booking.bookingReference}`}
                    >
                      {/* Card Header: Reference Code + Status Pill */}
                      <div className="booking-card-header">
                        <div className="booking-ref-block">
                          <span className="booking-ref-label">Reference</span>
                          <div className="booking-ref-code-wrap">
                            <span
                              className="booking-ref-code"
                              id={`booking-ref-${booking.bookingReference}`}
                              data-testid="booking-reference"
                            >
                              {booking.bookingReference}
                            </span>
                            <button
                              type="button"
                              className="btn-copy-ref"
                              onClick={() => handleCopyReference(booking.bookingReference)}
                              title="Copy booking reference to clipboard"
                              aria-label={`Copy booking reference ${booking.bookingReference}`}
                            >
                              {copiedRef === booking.bookingReference ? (
                                <span className="copy-feedback">Copied!</span>
                              ) : (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="booking-status-block">
                          <span className="booking-status-label">Current Status</span>
                          <span
                            className={`status-pill ${statusClass}`}
                            id={`status-badge-${booking.bookingReference}`}
                            data-testid="booking-status"
                            role="status"
                          >
                            {status}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Package Details + Key Metadata Grid */}
                      <div className="booking-card-body">
                        <div className="booking-package-heading">
                          <h2 className="booking-package-title">
                            {packageTitle}
                          </h2>
                          {destination && (
                            <span className="booking-destination-badge">
                              <span className="dest-icon" aria-hidden="true">📍</span> {destination}
                            </span>
                          )}
                        </div>

                        <div className="booking-meta-grid">
                          <div className="booking-meta-item">
                            <span className="meta-label">Booking Date</span>
                            <span className="meta-value" data-testid="booking-date">{formattedBookingDate}</span>
                          </div>

                          <div className="booking-meta-item">
                            <span className="meta-label">Travel Date</span>
                            <span className="meta-value meta-highlight" data-testid="travel-date">
                              {booking.travelDate || 'Date upon confirmation'}
                            </span>
                          </div>

                          <div className="booking-meta-item">
                            <span className="meta-item-label meta-label">Travelers</span>
                            <span className="meta-item-value meta-value" data-testid="traveler-count">
                              {travelerCount} {travelerCount === 1 ? 'Traveler' : 'Travelers'}
                            </span>
                          </div>

                          <div className="booking-meta-item">
                            <span className="meta-item-label meta-label">Lead Traveler</span>
                            <span className="meta-item-value traveler-name-value meta-value" title={booking.fullName}>
                              {booking.fullName || '—'}
                            </span>
                          </div>

                          {formattedPrice && (
                            <div className="booking-meta-item">
                              <span className="meta-item-label meta-label">Total Amount</span>
                              <span className="meta-item-value total-price-value meta-value meta-price">{formattedPrice}</span>
                            </div>
                          )}
                        </div>

                        {booking.additionalRequests && (
                          <div className="booking-special-requests">
                            <span className="requests-label">Special Requests:</span>
                            <p className="requests-text">{booking.additionalRequests}</p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Status explanation & Package navigation */}
                      <div className="booking-card-footer">
                        <div className="booking-status-note booking-status-hint">
                          {status.toLowerCase() === 'pending' && (
                            <span className="note-text note-pending hint-text hint-pending">
                              Awaiting travel specialist itinerary review. No payment required until confirmation.
                            </span>
                          )}
                          {status.toLowerCase() === 'confirmed' && (
                            <span className="note-text note-confirmed hint-text hint-confirmed">
                              ✓ Reservation confirmed. Your travel coordinator will be in touch with final travel vouchers.
                            </span>
                          )}
                          {status.toLowerCase() === 'rejected' && (
                            <span className="note-text note-rejected hint-text hint-rejected">
                              Reservation request could not be fulfilled for selected dates. Please contact support.
                            </span>
                          )}
                        </div>

                        {onViewPackage && booking.packageId && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm btn-view-pkg btn-view-package-link"
                            onClick={() => onViewPackage({ id: booking.packageId, title: packageTitle })}
                            id={`view-pkg-${booking.bookingReference}`}
                            aria-label={`View package details for ${packageTitle}`}
                          >
                            View Package Details
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
