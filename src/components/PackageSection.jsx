import React, { useState } from 'react';
import PackageCard from './PackageCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import DestinationSearch from './DestinationSearch';

export default function PackageSection({ 
  packages = [], 
  isLoading = false,
  error = null,
  onRetry,
  onViewDetails,
  previewMode = 'normal', // 'normal' | 'empty' | 'error'
  onChangePreviewMode 
}) {
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });

  const isSimulatedError = previewMode === 'error';
  const isSimulatedEmpty = previewMode === 'empty';
  const effectiveError = isSimulatedError ? 'Simulated API network failure. (Click "Try Again" to verify recovery).' : error;
  const displayPackages = isSimulatedEmpty ? [] : packages;

  // Case-insensitive, whitespace-trimmed partial destination filtering (TAMS-25)
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredPackages = trimmedQuery 
    ? displayPackages.filter((pkg) => (pkg.destination || '').toLowerCase().includes(trimmedQuery))
    : displayPackages;

  const handleClearSearch = () => {
    setSearchQuery('');
  };

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

        {/* Destination Search Bar (TAMS-24 / TAMS-25) */}
        <div className="section-search-bar">
          <DestinationSearch 
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {/* Dynamic State Rendering: Loading -> Error -> Empty Catalog -> Empty Search -> Filtered List */}
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
        ) : displayPackages.length === 0 ? (
          <EmptyState 
            onReset={() => {
              if (onChangePreviewMode) onChangePreviewMode('normal');
              if (onRetry) onRetry();
            }} 
          />
        ) : filteredPackages.length === 0 ? (
          <EmptyState 
            title="No packages found for this destination."
            subtitle={`We couldn't find any travel packages matching "${searchQuery.trim()}". Try searching for another destination or clear your search to view all trips.`}
            buttonText="Clear Search"
            onReset={handleClearSearch}
          />
        ) : (
          <div className="packages-grid" role="list" aria-label="Available Travel Packages">
            {filteredPackages.map((pkg) => (
              <div key={pkg.id} role="listitem">
                <PackageCard pkg={pkg} onViewDetails={onViewDetails} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
