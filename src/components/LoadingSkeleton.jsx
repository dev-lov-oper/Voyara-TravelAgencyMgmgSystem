import React from 'react';

export default function LoadingSkeleton() {
  const skeletonCards = Array.from({ length: 6 });

  return (
    <div 
      className="packages-grid loading-skeleton-grid" 
      aria-label="Loading available packages"
      aria-busy="true"
    >
      {skeletonCards.map((_, index) => (
        <div key={index} className="package-card skeleton-card">
          <div className="card-media skeleton-shimmer skeleton-media" />
          <div className="card-body">
            <div className="skeleton-line skeleton-shimmer skeleton-title" />
            <div className="skeleton-line skeleton-shimmer skeleton-category" />
            <div className="skeleton-line skeleton-shimmer skeleton-desc" />
            <div className="skeleton-line skeleton-shimmer skeleton-desc-short" />
            <div className="card-footer-info skeleton-footer">
              <div className="skeleton-line skeleton-shimmer skeleton-price" />
              <div className="skeleton-line skeleton-shimmer skeleton-btn" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
