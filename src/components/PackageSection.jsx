import React from 'react';
import PackageCard from './PackageCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';

export default function PackageSection({ 
  packages = [], 
  isLoading = false,
  error = null,
  onRetry,
  onViewDetails,
  previewMode = 'normal', // 'normal' | 'empty' | 'error'
  onChangePreviewMode 
}) {
  const isSimulatedError = previewMode === 'error';
  const isSimulatedEmpty = previewMode === 'empty';
  const effectiveError = isSimulatedError ? 'Simulated API network failure. (Click "Try Again" to verify recovery).' : error;
  const displayPackages = isSimulatedEmpty ? [] : packages;

  return (
    <section id="packages-section" className="packages-section" aria-labelledby="packages-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-header-text">
            <span className="section-tag">Featured Itineraries</span>
            <h2 id="packages-heading" className="section-title">
              Explore Travel Packages
            </h2>
            <p className="section-subtitle">
              Compare handpicked destinations, trip durations, and transparent pricing to find your ideal getaway.
            </p>
          </div>

          {/* Development / Reviewer preview toggle */}
          {onChangePreviewMode && (
            <div className="state-toggle-control" aria-label="Reviewer Preview Controls">
              <span className="toggle-label">Preview State:</span>
              <button
                type="button"
                className={`toggle-pill ${previewMode === 'normal' && !isLoading && !error ? 'is-active' : ''}`}
                onClick={() => onChangePreviewMode('normal')}
                aria-pressed={previewMode === 'normal'}
              >
                Packages ({packages.length})
              </button>
              <button
                type="button"
                className={`toggle-pill ${previewMode === 'empty' ? 'is-active' : ''}`}
                onClick={() => onChangePreviewMode('empty')}
                aria-pressed={previewMode === 'empty'}
              >
                Empty State
              </button>
              <button
                type="button"
                className={`toggle-pill ${previewMode === 'error' ? 'is-active' : ''}`}
                onClick={() => onChangePreviewMode('error')}
                aria-pressed={previewMode === 'error'}
              >
                Error State
              </button>
            </div>
          )}
        </div>

        {/* Dynamic State Rendering: Loading -> Error -> Empty -> List */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : effectiveError ? (
          <ErrorState 
            message={effectiveError} 
            onRetry={() => {
              if (onChangePreviewMode) onChangePreviewMode('normal');
              if (onRetry) onRetry();
            }} 
          />
        ) : displayPackages && displayPackages.length > 0 ? (
          <div className="packages-grid" role="list" aria-label="Available Travel Packages">
            {displayPackages.map((pkg) => (
              <div key={pkg.id} role="listitem">
                <PackageCard pkg={pkg} onViewDetails={onViewDetails} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            onReset={() => {
              if (onChangePreviewMode) onChangePreviewMode('normal');
              if (onRetry) onRetry();
            }} 
          />
        )}
      </div>
    </section>
  );
}
