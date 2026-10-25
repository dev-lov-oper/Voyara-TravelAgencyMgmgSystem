import React, { useState, useEffect, useMemo } from 'react';
import {
  getAgentBookings,
  getStoredAgentToken,
  getStoredAgentInfo,
  clearStoredAgentSession,
  loginAgent,
} from '../services/agentService.js';
import { formatBookingDate, getStatusClass } from '../utils/bookingStatusUtils.js';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

/**
 * AgentBookingDashboard Component (TAMS-39)
 * Dedicated travel agent interface for reviewing customer booking requests.
 * Displays booking reference, customer name, contact details (email & phone),
 * travel package name, booking date, travel date, traveler count, and live booking status.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.bookings] - Optional controlled bookings array (for testing/mocking)
 * @param {boolean} [props.isLoading] - Optional controlled loading state
 * @param {string|null} [props.error] - Optional controlled error state
 * @param {string} [props.agentToken] - Optional explicit agent auth token
 * @param {Object} [props.agentInfo] - Optional explicit agent profile
 * @param {Function} [props.onRetry] - Optional retry callback
 * @param {Function} [props.onExplorePackages] - Callback to return to package exploration
 * @param {string} [props.initialStatusFilter='All'] - Initial status filter tab
 * @param {string} [props.initialSearchQuery=''] - Initial search filter
 * @param {'table'|'card'} [props.initialViewMode='table'] - Initial view layout mode
 */
export default function AgentBookingDashboard({
  bookings: propBookings,
  isLoading: propIsLoading,
  error: propError,
  agentToken: propAgentToken,
  agentInfo: propAgentInfo,
  onRetry: propOnRetry,
  onExplorePackages,
  initialStatusFilter = 'All',
  initialSearchQuery = '',
  initialViewMode = 'table',
}) {
  const isControlled = propBookings !== undefined;
  const initialToken = propAgentToken || (typeof window !== 'undefined' ? getStoredAgentToken() : null);

  const [internalBookings, setInternalBookings] = useState([]);
  const [internalLoading, setInternalLoading] = useState(() => {
    if (isControlled) return false;
    return Boolean(initialToken);
  });
  const [internalError, setInternalError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Authentication State
  const [isUnauthenticated, setIsUnauthenticated] = useState(() => {
    if (isControlled) return false;
    return !initialToken;
  });
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [currentAgent, setCurrentAgent] = useState(() => propAgentInfo || getStoredAgentInfo());

  // Filter & UI Display State
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [copiedRef, setCopiedRef] = useState(null);

  // Effective state
  const bookingsList = isControlled ? propBookings : internalBookings;
  const error = propError !== undefined ? propError : internalError;
  const isLoading = propIsLoading !== undefined ? propIsLoading : (propError ? false : internalLoading);
  const effectiveAgent = propAgentInfo || currentAgent;

  // Fetch real agent bookings from backend
  useEffect(() => {
    if (isControlled) return;

    const token = propAgentToken || getStoredAgentToken();
    if (!token) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    getAgentBookings({ token, signal: controller.signal })
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
          if (err.status === 401 || err.status === 403) {
            clearStoredAgentSession();
            setIsUnauthenticated(true);
          }
          setInternalError(err.message || 'Failed to load booking requests.');
          setInternalLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [fetchKey, propAgentToken, isControlled]);

  // Handle agent sign-in submission
  const handleAgentSignIn = async (e) => {
    e.preventDefault();
    setAuthError(null);

    const emailTrimmed = authEmail.trim();
    if (!emailTrimmed) {
      setAuthError('Please enter your agent email address.');
      return;
    }
    if (!authPassword.trim()) {
      setAuthError('Please enter your agent password.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await loginAgent({
        email: emailTrimmed,
        password: authPassword.trim(),
      });
      setCurrentAgent(result.agent);
      setIsUnauthenticated(false);
      setFetchKey((k) => k + 1);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle demo quick fill
  const handleQuickFillAgent = () => {
    setAuthEmail('agent@voyara.com');
    setAuthPassword('agent123');
    setAuthError(null);
  };

  // Handle sign out
  const handleAgentSignOut = () => {
    clearStoredAgentSession();
    setCurrentAgent(null);
    setInternalBookings([]);
    setIsUnauthenticated(true);
  };

  // Manual retry / refresh
  const handleRefresh = () => {
    if (propOnRetry) {
      propOnRetry();
    } else {
      setInternalLoading(true);
      setInternalError(null);
      setFetchKey((k) => k + 1);
    }
  };

  // Copy booking reference helper
  const handleCopyReference = (ref) => {
    if (!ref) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ref).catch(() => {});
    }
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Calculate counts for metrics
  const stats = useMemo(() => {
    const list = Array.isArray(bookingsList) ? bookingsList : [];
    const total = list.length;
    let pending = 0;
    let confirmed = 0;
    let rejected = 0;

    for (const b of list) {
      const s = (b.status || '').toLowerCase().trim();
      if (s === 'confirmed') confirmed++;
      else if (s === 'rejected') rejected++;
      else pending++;
    }

    return { total, pending, confirmed, rejected };
  }, [bookingsList]);

  // Filter bookings according to active status tab and search term
  const filteredBookings = useMemo(() => {
    const list = Array.isArray(bookingsList) ? bookingsList : [];
    return list.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== 'All') {
        const itemStatus = (item.status || '').toLowerCase().trim();
        const targetStatus = statusFilter.toLowerCase().trim();
        if (itemStatus !== targetStatus) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (item.bookingReference || '').toLowerCase();
        const name = (item.fullName || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        const pkgTitle = (item.packageTitle || '').toLowerCase();
        const pkgDest = (item.packageDestination || '').toLowerCase();

        const matches =
          ref.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          pkgTitle.includes(q) ||
          pkgDest.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [bookingsList, statusFilter, searchQuery]);

  // ---------------------------------------------------------------------------
  // 1. Unauthenticated State (Agent Access Flow)
  // ---------------------------------------------------------------------------
  if (isUnauthenticated) {
    return (
      <div
        className="agent-dashboard-page"
        role="region"
        aria-labelledby="agent-auth-heading"
        data-testid="agent-booking-dashboard"
      >
        <div className="agent-dashboard-container">
          <div className="agent-auth-card" data-testid="agent-auth-gate">
            <div className="agent-auth-badge">
              <span className="badge-shield-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span>Authorized Personnel Only</span>
            </div>

            <div className="agent-auth-header">
              <h1 id="agent-auth-heading" className="agent-auth-title">
                Agent Portal Access
              </h1>
              <p className="agent-auth-subtitle">
                Sign in to review and manage customer booking requests.
              </p>
            </div>

            {authError && (
              <div className="agent-auth-error-banner" role="alert" data-testid="agent-auth-error">
                <span className="error-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <span>{authError}</span>
              </div>
            )}

            <form className="agent-auth-form" onSubmit={handleAgentSignIn}>
              <div className="form-group">
                <label htmlFor="agent-login-email" className="form-label">
                  Agent Work Email
                </label>
                <input
                  id="agent-login-email"
                  type="email"
                  className="form-input"
                  placeholder="agent@voyara.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="agent-login-password" className="form-label">
                  Agent Password
                </label>
                <input
                  id="agent-login-password"
                  type="password"
                  className="form-input"
                  placeholder="Enter agent password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                id="agent-login-submit"
                type="submit"
                className="btn btn-primary btn-block btn-auth-submit"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <span className="btn-loading-content">
                    <span className="spinner-icon-sm" aria-hidden="true"></span>
                    Authenticating Agent...
                  </span>
                ) : (
                  'Sign In to Agent Dashboard'
                )}
              </button>
            </form>

            <div className="agent-auth-demo-hint">
              <span className="demo-label">Default Demo Agent Credentials:</span>
              <button
                type="button"
                className="btn-demo-pill"
                onClick={handleQuickFillAgent}
              >
                Auto-fill: agent@voyara.com / agent123
              </button>
            </div>

            {onExplorePackages && (
              <div className="agent-auth-footer-nav">
                <button
                  type="button"
                  className="btn-link-subtle"
                  onClick={onExplorePackages}
                >
                  ← Return to Customer Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Main Agent Dashboard View (Authenticated)
  // ---------------------------------------------------------------------------
  return (
    <div
      className="agent-dashboard-page"
      role="region"
      aria-labelledby="agent-dashboard-heading"
      data-testid="agent-booking-dashboard"
    >
      <div className="agent-dashboard-container">
        {/* Top Header */}
        <header className="agent-dashboard-header">
          <div className="agent-header-left">
            <div className="agent-title-pill">
              <span className="agent-pulse-dot" aria-hidden="true"></span>
              Agent Workspace
            </div>
            <h1 id="agent-dashboard-heading" className="agent-dashboard-title">
              Agent Booking Dashboard
            </h1>
            <p className="agent-dashboard-subtitle">
              Review customer booking requests, traveler contact details, and current booking statuses.
            </p>
          </div>

          <div className="agent-header-actions">
            {effectiveAgent && (
              <div className="agent-profile-chip" data-testid="agent-profile-info">
                <span className="agent-avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className="agent-name-text">
                  {effectiveAgent.fullName || 'Voyara Travel Agent'}
                </span>
                <span className="agent-email-tag">
                  {effectiveAgent.email}
                </span>
              </div>
            )}

            <button
              id="agent-refresh-btn"
              type="button"
              className="btn btn-outline btn-sm agent-action-btn"
              onClick={handleRefresh}
              title="Refresh booking requests"
              aria-label="Refresh booking requests"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>

            <button
              id="agent-logout-btn"
              type="button"
              className="btn btn-outline btn-sm agent-logout-btn"
              onClick={handleAgentSignOut}
              title="Sign out of agent dashboard"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Metric / Stat Overview Cards */}
        <section className="agent-metrics-grid" aria-label="Booking summary metrics">
          {/* Total Bookings */}
          <button
            type="button"
            className={`metric-card ${statusFilter === 'All' ? 'metric-card-active' : ''}`}
            onClick={() => setStatusFilter('All')}
            aria-label={`Total bookings: ${stats.total}. Filter by all.`}
          >
            <div className="metric-header">
              <span className="metric-label">Total Requests</span>
              <span className="metric-badge metric-badge-total" aria-hidden="true">All</span>
            </div>
            <div className="metric-value" data-testid="stat-total-bookings">
              {stats.total}
            </div>
            <div className="metric-subtext">Received customer inquiries</div>
          </button>

          {/* Pending Review */}
          <button
            type="button"
            className={`metric-card metric-card-pending ${statusFilter === 'Pending' ? 'metric-card-active' : ''}`}
            onClick={() => setStatusFilter('Pending')}
            aria-label={`Pending bookings: ${stats.pending}. Filter by pending.`}
          >
            <div className="metric-header">
              <span className="metric-label">Pending Review</span>
              <span className="metric-indicator-dot dot-pending" aria-hidden="true"></span>
            </div>
            <div className="metric-value text-amber" data-testid="stat-pending-bookings">
              {stats.pending}
            </div>
            <div className="metric-subtext">Awaiting agent response</div>
          </button>

          {/* Confirmed */}
          <button
            type="button"
            className={`metric-card metric-card-confirmed ${statusFilter === 'Confirmed' ? 'metric-card-active' : ''}`}
            onClick={() => setStatusFilter('Confirmed')}
            aria-label={`Confirmed bookings: ${stats.confirmed}. Filter by confirmed.`}
          >
            <div className="metric-header">
              <span className="metric-label">Confirmed</span>
              <span className="metric-indicator-dot dot-confirmed" aria-hidden="true"></span>
            </div>
            <div className="metric-value text-emerald" data-testid="stat-confirmed-bookings">
              {stats.confirmed}
            </div>
            <div className="metric-subtext">Approved and scheduled</div>
          </button>

          {/* Rejected */}
          <button
            type="button"
            className={`metric-card metric-card-rejected ${statusFilter === 'Rejected' ? 'metric-card-active' : ''}`}
            onClick={() => setStatusFilter('Rejected')}
            aria-label={`Rejected bookings: ${stats.rejected}. Filter by rejected.`}
          >
            <div className="metric-header">
              <span className="metric-label">Rejected</span>
              <span className="metric-indicator-dot dot-rejected" aria-hidden="true"></span>
            </div>
            <div className="metric-value text-rose" data-testid="stat-rejected-bookings">
              {stats.rejected}
            </div>
            <div className="metric-subtext">Declined inquiries</div>
          </button>
        </section>

        {/* Toolbar: Search, Status Tabs, and View Toggle */}
        <section className="agent-toolbar-card" aria-label="Filter booking requests">
          <div className="agent-toolbar-left">
            {/* Search Input */}
            <div className="agent-search-wrap">
              <span className="agent-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="agent-dashboard-search"
                type="text"
                className="agent-search-input"
                placeholder="Search by customer name, email, phone, reference, or package..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter bookings by keyword"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="agent-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="agent-status-pills" role="tablist" aria-label="Filter by booking status">
              {['All', 'Pending', 'Confirmed', 'Rejected'].map((status) => {
                const isSelected = statusFilter === status;
                let count = stats.total;
                if (status === 'Pending') count = stats.pending;
                else if (status === 'Confirmed') count = stats.confirmed;
                else if (status === 'Rejected') count = stats.rejected;

                return (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    id={`filter-tab-${status.toLowerCase()}`}
                    aria-selected={isSelected}
                    className={`agent-status-tab ${isSelected ? 'active' : ''}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    <span>{status}</span>
                    <span className="status-tab-count">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="agent-toolbar-right">
            {/* View Mode Switcher (Table vs Cards) */}
            <div className="agent-view-switcher" role="group" aria-label="Select layout view">
              <button
                type="button"
                className={`btn-switcher ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
                aria-pressed={viewMode === 'table'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                <span>Table</span>
              </button>
              <button
                type="button"
                className={`btn-switcher ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
                title="Card view"
                aria-pressed={viewMode === 'card'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Cards</span>
              </button>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            3. Loading State
            ------------------------------------------------------------------- */}
        {isLoading && (
          <div
            className="agent-loading-state"
            role="status"
            aria-busy="true"
            aria-label="Loading customer booking requests"
            data-testid="agent-loading-state"
          >
            <div className="agent-loading-spinner" aria-hidden="true"></div>
            <h3 className="loading-title">Loading Customer Booking Requests...</h3>
            <p className="loading-subtitle">
              Retrieving live booking records and traveler contact details from the database.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------------------
            4. Error State
            ------------------------------------------------------------------- */}
        {!isLoading && error && (
          <div data-testid="agent-error-state">
            <ErrorState
              title="Unable to load customer booking requests"
              message={error}
              onRetry={handleRefresh}
            />
          </div>
        )}

        {/* -------------------------------------------------------------------
            5. Empty States
            ------------------------------------------------------------------- */}
        {!isLoading && !error && bookingsList.length === 0 && (
          <div data-testid="agent-empty-state">
            <EmptyState
              title="No customer booking requests found"
              subtitle="There are currently no customer bookings submitted in the system."
              buttonText="Refresh Bookings"
              onReset={handleRefresh}
            />
          </div>
        )}

        {!isLoading && !error && bookingsList.length > 0 && filteredBookings.length === 0 && (
          <div className="agent-filter-empty-card" data-testid="agent-filtered-empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="empty-title">No bookings match your filter criteria</h3>
            <p className="empty-subtitle">
              No booking records match {searchQuery ? `"${searchQuery}"` : ''}{' '}
              {statusFilter !== 'All' ? `with status "${statusFilter}"` : ''}.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------------
            6. Booking Records Display (Table & Card Layouts)
            ------------------------------------------------------------------- */}
        {!isLoading && !error && filteredBookings.length > 0 && (
          <div className="agent-results-wrapper">
            <div className="agent-results-info">
              <span>
                Showing <strong>{filteredBookings.length}</strong> of{' '}
                <strong>{bookingsList.length}</strong> customer bookings
              </span>
              {copiedRef && (
                <span className="copy-toast" role="status">
                  ✓ Copied reference {copiedRef} to clipboard
                </span>
              )}
            </div>

            {/* Layout A: Table View */}
            {viewMode === 'table' ? (
              <div
                className="agent-table-responsive-container"
                data-testid="agent-bookings-table-container"
              >
                <table className="agent-bookings-table" data-testid="agent-bookings-table">
                  <caption className="sr-only">Customer Booking Requests for Travel Agents</caption>
                  <thead>
                    <tr>
                      <th scope="col">Booking Ref</th>
                      <th scope="col">Customer Name</th>
                      <th scope="col">Contact Details</th>
                      <th scope="col">Package Name</th>
                      <th scope="col">Booking Date</th>
                      <th scope="col">Travel Dates</th>
                      <th scope="col">Travelers</th>
                      <th scope="col">Total Price</th>
                      <th scope="col">Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const statusClass = getStatusClass(booking.status);

                      return (
                        <tr
                          key={booking.bookingReference || booking.id}
                          className="agent-table-row"
                          data-testid="agent-booking-row"
                        >
                          {/* 1. Booking Reference */}
                          <td className="cell-reference">
                            <div className="ref-copy-wrap">
                              <span
                                className="code-ref"
                                data-testid="booking-reference"
                                title="Click to copy booking reference"
                                onClick={() => handleCopyReference(booking.bookingReference)}
                              >
                                {booking.bookingReference || 'N/A'}
                              </span>
                              <button
                                type="button"
                                className="btn-icon-copy"
                                onClick={() => handleCopyReference(booking.bookingReference)}
                                title="Copy booking reference"
                                aria-label={`Copy reference ${booking.bookingReference}`}
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </button>
                            </div>
                          </td>

                          {/* 2. Customer Name */}
                          <td className="cell-customer-name">
                            <div className="customer-name-block">
                              <span className="customer-full-name" data-testid="customer-name">
                                {booking.fullName || 'Unknown Customer'}
                              </span>
                            </div>
                          </td>

                          {/* 3. Customer Contact Details (Email & Phone) */}
                          <td className="cell-contact">
                            <div className="customer-contact-block" data-testid="customer-contact-details">
                              {booking.email ? (
                                <a
                                  href={`mailto:${booking.email}`}
                                  className="contact-link email-link"
                                  title={`Email ${booking.fullName}: ${booking.email}`}
                                  data-testid="customer-email"
                                >
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                  </svg>
                                  <span>{booking.email}</span>
                                </a>
                              ) : (
                                <span className="text-muted">No email</span>
                              )}
                              {booking.phone ? (
                                <a
                                  href={`tel:${booking.phone}`}
                                  className="contact-link phone-link"
                                  title={`Call ${booking.fullName}: ${booking.phone}`}
                                  data-testid="customer-phone"
                                >
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                  <span>{booking.phone}</span>
                                </a>
                              ) : (
                                <span className="text-muted">No phone</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Travel Package Name */}
                          <td className="cell-package">
                            <div className="package-info-block">
                              <span className="package-title" data-testid="package-name">
                                {booking.packageTitle || 'Voyara Package'}
                              </span>
                              {booking.packageDestination && (
                                <span className="package-destination-tag">
                                  {booking.packageDestination}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Booking Date */}
                          <td className="cell-booking-date">
                            <span className="date-text" data-testid="booking-date">
                              {formatBookingDate(booking.createdAt)}
                            </span>
                          </td>

                          {/* 6. Travel Dates */}
                          <td className="cell-travel-date">
                            <span className="date-highlight" data-testid="travel-dates">
                              {formatBookingDate(booking.travelDate)}
                            </span>
                          </td>

                          {/* 7. Number of Travelers */}
                          <td className="cell-travelers">
                            <span className="travelers-badge" data-testid="traveler-count">
                              {booking.travelerCount}{' '}
                              {Number(booking.travelerCount) === 1 ? 'Traveler' : 'Travelers'}
                            </span>
                          </td>

                          {/* 8. Total Price */}
                          <td className="cell-price">
                            <span className="price-text" data-testid="booking-price">
                              {booking.formattedTotal ||
                                (booking.totalPrice
                                  ? `₹${Number(booking.totalPrice).toLocaleString('en-IN')}`
                                  : 'N/A')}
                            </span>
                          </td>

                          {/* 9. Current Booking Status */}
                          <td className="cell-status">
                            <span
                              className={`status-pill ${statusClass}`}
                              data-testid="booking-status"
                            >
                              <span className="status-indicator-dot" aria-hidden="true"></span>
                              <span className="status-text">{booking.status || 'Pending'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Layout B: Card Grid View */
              <div
                className="agent-cards-grid"
                data-testid="agent-bookings-card-container"
              >
                {filteredBookings.map((booking) => {
                  const statusClass = getStatusClass(booking.status);

                  return (
                    <article
                      key={booking.bookingReference || booking.id}
                      className="agent-booking-card"
                      data-testid="agent-booking-card"
                    >
                      {/* Card Header: Reference & Status Badge */}
                      <div className="card-top-row">
                        <div className="card-ref-wrap">
                          <span className="ref-label">Reference</span>
                          <span
                            className="ref-code"
                            data-testid="booking-reference"
                            onClick={() => handleCopyReference(booking.bookingReference)}
                          >
                            {booking.bookingReference || 'N/A'}
                          </span>
                        </div>
                        <span
                          className={`status-pill ${statusClass}`}
                          data-testid="booking-status"
                        >
                          <span className="status-indicator-dot" aria-hidden="true"></span>
                          <span className="status-text">{booking.status || 'Pending'}</span>
                        </span>
                      </div>

                      {/* Package Name */}
                      <div className="card-package-block">
                        <h3 className="card-package-title" data-testid="package-name">
                          {booking.packageTitle || 'Voyara Travel Package'}
                        </h3>
                        {booking.packageDestination && (
                          <span className="card-destination-tag">
                            {booking.packageDestination}
                          </span>
                        )}
                      </div>

                      {/* Customer Info & Contact Details */}
                      <div className="card-customer-section" data-testid="customer-contact-details">
                        <div className="customer-row">
                          <span className="row-label">Traveler:</span>
                          <strong className="customer-name" data-testid="customer-name">
                            {booking.fullName || 'Unknown Customer'}
                          </strong>
                        </div>
                        {booking.email && (
                          <div className="customer-row">
                            <span className="row-label">Email:</span>
                            <a
                              href={`mailto:${booking.email}`}
                              className="contact-link"
                              data-testid="customer-email"
                            >
                              {booking.email}
                            </a>
                          </div>
                        )}
                        {booking.phone && (
                          <div className="customer-row">
                            <span className="row-label">Phone:</span>
                            <a
                              href={`tel:${booking.phone}`}
                              className="contact-link"
                              data-testid="customer-phone"
                            >
                              {booking.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Key Details Grid: Travel Date, Booked On, Traveler Count, Total Price */}
                      <div className="card-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Travel Date</span>
                          <span className="detail-value" data-testid="travel-dates">
                            {formatBookingDate(booking.travelDate)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Booking Date</span>
                          <span className="detail-value" data-testid="booking-date">
                            {formatBookingDate(booking.createdAt)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Travelers</span>
                          <span className="detail-value" data-testid="traveler-count">
                            {booking.travelerCount}{' '}
                            {Number(booking.travelerCount) === 1 ? 'Traveler' : 'Travelers'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Total Amount</span>
                          <span className="detail-value detail-price" data-testid="booking-price">
                            {booking.formattedTotal ||
                              (booking.totalPrice
                                ? `₹${Number(booking.totalPrice).toLocaleString('en-IN')}`
                                : 'N/A')}
                          </span>
                        </div>
                      </div>

                      {booking.additionalRequests && (
                        <div className="card-requests-note">
                          <span className="note-label">Requests: </span>
                          <span className="note-text">{booking.additionalRequests}</span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
