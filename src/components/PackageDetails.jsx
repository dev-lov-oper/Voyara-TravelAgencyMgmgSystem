import React, { useState } from 'react';

/**
 * PackageDetails Component (TAMS-11 & TAMS-31 & TAMS-32)
 * Renders full travel package details, including day-by-day itinerary,
 * inclusions, exclusions, and responsive breadcrumb/back navigation.
 *
 * @param {Object} props
 * @param {Object|null} props.pkg - Selected normalized package object
 * @param {Function} props.onBack - Callback to return to the package listing
 * @param {Function} [props.onHome] - Callback to return to the home page hero view
 * @param {Function} [props.onBook] - Callback to transition to the booking form
 * @param {boolean} [props.isLoading] - Loading indicator state
 * @param {string|null} [props.error] - Error message state
 * @param {Function} [props.onRetry] - Callback to retry package loading
 */
export default function PackageDetails({
  pkg,
  onBack,
  onHome,
  onBook,
  isLoading = false,
  error = null,
  onRetry,
}) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const imageError = failedImageUrl === pkg?.imageUrl;

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="package-details-page is-loading" aria-busy="true" aria-label="Loading package details">
        <div className="section-container">
          <div className="details-skeleton-nav skeleton"></div>
          <div className="details-skeleton-hero skeleton"></div>
          <div className="details-skeleton-grid">
            <div className="details-skeleton-main skeleton"></div>
            <div className="details-skeleton-sidebar skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="package-details-page is-error">
        <div className="section-container">
          <div className="details-error-card" role="alert">
            <div className="details-error-icon" aria-hidden="true">⚠️</div>
            <h2 className="details-error-title">Unable to Load Package Details</h2>
            <p className="details-error-message">{error}</p>
            <div className="details-error-actions">
              {onRetry && (
                <button type="button" className="btn btn-primary" onClick={onRetry}>
                  Try Again
                </button>
              )}
              {onBack && (
                <button type="button" className="btn btn-secondary" onClick={onBack}>
                  Back to Packages
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Package Not Found State (Invalid identifier)
  if (!pkg) {
    return (
      <div className="package-details-page is-not-found">
        <div className="section-container">
          <div className="package-not-found-card" role="region" aria-labelledby="not-found-heading">
            <div className="not-found-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
              </svg>
            </div>
            <h2 id="not-found-heading" className="not-found-title">Package Not Found</h2>
            <p className="not-found-text">
              We couldn't find the travel package you're looking for. It may have been removed or the link might be invalid.
            </p>
            {onBack && (
              <button
                type="button"
                className="btn btn-primary btn-back-listing"
                onClick={onBack}
                id="back-to-listing-btn"
              >
                ← Back to All Packages
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Populate details with safe fallbacks
  const title = pkg.title || 'Curated Escape';
  const destination = pkg.destination || 'India';
  const durationText = pkg.durationText || (pkg.duration ? `${pkg.duration} days` : 'Flexible duration');
  const formattedPrice = pkg.formattedPrice || (
    pkg.price ? `₹${Number(pkg.price).toLocaleString('en-IN')}` : 'Inquire for pricing'
  );
  const description = pkg.description || 'Explore this curated travel itinerary handpicked by Voyara experts.';
  const category = pkg.category || 'Curated Trip';
  const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const exclusions = Array.isArray(pkg.exclusions) ? pkg.exclusions : [];

  // Chronologically sort itinerary days
  const sortedItinerary = [...itinerary].sort(
    (a, b) => (Number(a.day) || 0) - (Number(b.day) || 0)
  );

  return (
    <article className="package-details-page" aria-labelledby="details-package-title">
      <div className="section-container">
        
        {/* Navigation Breadcrumb & Back Action */}
        <nav className="details-navigation" aria-label="Breadcrumb and back navigation">
          <button
            type="button"
            className="btn-back-link"
            onClick={onBack}
            id="back-to-listing-link"
            aria-label="Return to package listing"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Packages
          </button>

          <ol className="details-breadcrumbs">
            <li>
              <button
                type="button"
                className="crumb-btn"
                onClick={onHome || onBack}
                aria-label="Return to Home"
              >
                Home
              </button>
            </li>
            <li aria-hidden="true" className="crumb-sep">/</li>
            <li>
              <button type="button" className="crumb-btn" onClick={onBack}>
                Packages
              </button>
            </li>
            <li aria-hidden="true" className="crumb-sep">/</li>
            <li aria-current="page" className="crumb-active">{destination}</li>
          </ol>
        </nav>

        {/* Hero Banner Section */}
        <header className="details-hero-section">
          <div className="details-media-wrapper">
            {!imageError && pkg.imageUrl ? (
              <img
                src={pkg.imageUrl}
                alt={pkg.imageAlt || `${title} in ${destination}`}
                className="details-hero-image"
                onError={() => setFailedImageUrl(pkg.imageUrl)}
              />
            ) : (
              <div className="details-image-fallback" role="img" aria-label={title}>
                <span>{destination}</span>
              </div>
            )}
            <div className="details-media-overlay"></div>
            
            <div className="details-hero-badges">
              <span className="badge badge-destination">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {destination}
              </span>
              <span className="badge badge-duration">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {durationText}
              </span>
              <span className="badge badge-category">{category}</span>
            </div>
          </div>

          <div className="details-header-content">
            <h1 id="details-package-title" className="details-title">
              {title}
            </h1>
            <p className="details-destination-tagline">
              Curated Voyage in <strong>{destination}</strong>, India
            </p>
          </div>
        </header>

        {/* Quick Highlights / Spec Cards */}
        <section className="details-quick-specs" aria-label="Key package specifications">
          <div className="spec-card">
            <span className="spec-label">Trip Duration</span>
            <span className="spec-value">{durationText}</span>
            <span className="spec-sub">{pkg.duration ? `${pkg.duration - 1} Nights / ${pkg.duration} Days` : 'Flexible duration'}</span>
          </div>

          <div className="spec-card price-highlight-card">
            <span className="spec-label">Package Price</span>
            <span className="spec-value price-text">{formattedPrice}</span>
            <span className="spec-sub">Per person (taxes included)</span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Primary Destination</span>
            <span className="spec-value">{destination}</span>
            <span className="spec-sub">India</span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Trip Category</span>
            <span className="spec-value">{category}</span>
            <span className="spec-sub">Handpicked by Voyara</span>
          </div>
        </section>

        {/* Main Details Layout (2 Columns: Left = Description & Itinerary, Right = Inclusions & Exclusions) */}
        <div className="details-layout-grid">
          <div className="details-main-column">
            
            {/* Overview / Full Description */}
            <section className="details-section-card" aria-labelledby="heading-overview">
              <h2 id="heading-overview" className="details-section-title">
                Package Overview
              </h2>
              <div className="details-description-body">
                <p>{description}</p>
              </div>
            </section>

            {/* Day-by-Day Itinerary (TAMS-31) */}
            <section className="details-section-card" aria-labelledby="heading-itinerary">
              <div className="section-title-wrap">
                <h2 id="heading-itinerary" className="details-section-title">
                  Day-by-Day Itinerary
                </h2>
                {sortedItinerary.length > 0 && (
                  <span className="itinerary-badge">
                    {sortedItinerary.length} {sortedItinerary.length === 1 ? 'Day' : 'Days'} Schedule
                  </span>
                )}
              </div>

              {sortedItinerary.length > 0 ? (
                <div className="itinerary-timeline" role="list" aria-label="Day-by-day tour itinerary">
                  {sortedItinerary.map((item, index) => {
                    const dayNum = item.day || index + 1;
                    return (
                      <div key={item.id || `${dayNum}-${index}`} className="itinerary-item" role="listitem">
                        <div className="itinerary-day-indicator">
                          <span className="day-number">Day {dayNum}</span>
                        </div>
                        <div className="itinerary-day-content">
                          <h3 className="itinerary-day-title">{item.title || `Day ${dayNum}`}</h3>
                          {item.description && (
                            <p className="itinerary-day-description">{item.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="details-empty-note" role="note">
                  <p>
                    Itinerary details for this package are currently unavailable. A customized day-by-day schedule can be tailored upon inquiry.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar / Inclusions & Exclusions Column (TAMS-31) */}
          <aside className="details-sidebar-column">
            
            {/* What's Included */}
            <section className="details-inclusions-card" aria-labelledby="heading-inclusions">
              <h2 id="heading-inclusions" className="inclusions-title">
                <span className="inclusion-title-icon" aria-hidden="true">✓</span>
                What's Included
              </h2>

              {inclusions.length > 0 ? (
                <ul className="inclusions-list" role="list" aria-label="Package inclusions">
                  {inclusions.map((item, idx) => (
                    <li key={idx} className="inclusion-item" role="listitem">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="check-icon" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="details-empty-note-small">
                  No specific inclusions listed for this package. Inclusion details are available upon request.
                </p>
              )}
            </section>

            {/* What's Not Included (Exclusions) */}
            {exclusions.length > 0 && (
              <section className="details-exclusions-card" aria-labelledby="heading-exclusions">
                <h2 id="heading-exclusions" className="exclusions-title">
                  <span className="exclusion-title-icon" aria-hidden="true">✕</span>
                  What's Not Included
                </h2>

                <ul className="exclusions-list" role="list" aria-label="Package exclusions">
                  {exclusions.map((item, idx) => (
                    <li key={idx} className="exclusion-item" role="listitem">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="cross-icon" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Return & Booking Action in Sidebar */}
            <div className="details-sidebar-cta">
              {onBook && (
                <button
                  type="button"
                  className="btn btn-primary btn-full-width btn-book-now"
                  onClick={() => onBook(pkg)}
                  id="book-package-btn"
                >
                  Book This Package
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-full-width"
                onClick={onBack}
              >
                ← Back to All Packages
              </button>
            </div>

          </aside>
        </div>

        {/* Bottom Navigation Link */}
        <div className="details-bottom-nav">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
          >
            ← Return to Package Listing
          </button>
        </div>

      </div>
    </article>
  );
}
