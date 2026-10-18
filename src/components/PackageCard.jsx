import React, { useState } from 'react';

export default function PackageCard({ pkg, onViewDetails }) {
  const [imageError, setImageError] = useState(false);

  if (!pkg) return null;

  const title = pkg.title || 'Curated Escape';
  const destination = pkg.destination || 'India';
  const durationText = pkg.durationText || (pkg.duration ? `${pkg.duration} days` : 'Flexible');
  const formattedPrice = pkg.formattedPrice || (
    pkg.price ? `₹${Number(pkg.price).toLocaleString('en-IN')}` : 'Inquire for price'
  );
  const description = pkg.description || 'Explore this handpicked travel itinerary with Voyara.';
  const category = pkg.category || 'Curated Tour';
  const id = pkg.id || 'pkg-item';

  const handleDetailsClick = (e) => {
    e.preventDefault();
    if (onViewDetails) {
      onViewDetails(pkg);
    }
  };

  return (
    <article className="package-card" aria-labelledby={`pkg-title-${id}`}>
      {/* Card Visual with destination tag & duration pill */}
      <div className="card-media">
        {!imageError && pkg.imageUrl ? (
          <img
            src={pkg.imageUrl}
            alt={pkg.imageAlt || `${title} in ${destination}`}
            className="card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-image-fallback" role="img" aria-label={title}>
            <span className="fallback-destination">{destination}</span>
          </div>
        )}
        <div className="card-badges">
          <span className="badge badge-destination" aria-label={`Destination: ${destination}`}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {destination}
          </span>
          <span className="badge badge-duration" aria-label={`Duration: ${durationText}`}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {durationText}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-body">
        <div className="card-header-group">
          <h3 id={`pkg-title-${id}`} className="card-title">
            {title}
          </h3>
          <p className="card-category">{category}</p>
        </div>

        <p className="card-description">
          {description}
        </p>

        {/* Card Pricing and Action */}
        <div className="card-footer-info">
          <div className="price-container">
            <span className="price-label">Starting from</span>
            <span className="price-value">{formattedPrice}</span>
            <span className="price-period">/ person</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-card"
            onClick={handleDetailsClick}
            aria-label={`View details for ${title} in ${destination}`}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
