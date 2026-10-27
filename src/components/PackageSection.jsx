import React, { useState } from 'react';
import PackageCard from './PackageCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import DestinationSearch from './DestinationSearch';
import BudgetFilter from './BudgetFilter';

export default function PackageSection({ 
  packages = [], 
  isLoading = false,
  error = null,
  onRetry,
  onViewDetails,
  previewMode = 'normal', // 'normal' | 'empty' | 'error'
  onChangePreviewMode,
  initialSearchQuery,
  onSearchChange,
  initialMinBudget = null,
  initialMaxBudget = null,
  onBudgetChange,
}) {
  const [searchQuery, setSearchQuery] = useState(() => {
    if (initialSearchQuery !== undefined) return initialSearchQuery;
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });

  const [appliedBudget, setAppliedBudget] = useState(() => {
    if (initialMinBudget !== null || initialMaxBudget !== null) {
      return { min: initialMinBudget, max: initialMaxBudget };
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const minParam = params.get('minBudget');
      const maxParam = params.get('maxBudget');
      return {
        min: minParam !== null && minParam !== '' ? Number(minParam) : null,
        max: maxParam !== null && maxParam !== '' ? Number(maxParam) : null,
      };
    }
    return { min: null, max: null };
  });

  const isSimulatedError = previewMode === 'error';
  const isSimulatedEmpty = previewMode === 'empty';
  const effectiveError = isSimulatedError ? 'Simulated API network failure. (Click "Try Again" to verify recovery).' : error;
  const displayPackages = isSimulatedEmpty ? [] : packages;

  // Extract unique available destinations for quick filtering chips
  const availableDestinations = [];
  const seenDests = new Set();
  (displayPackages || []).forEach((p) => {
    if (p && p.destination && typeof p.destination === 'string' && p.destination.trim()) {
      const dest = p.destination.trim();
      if (!seenDests.has(dest)) {
        seenDests.add(dest);
        availableDestinations.push(dest);
      }
    }
  });

  // Destination Search logic (TAMS-25): trimmed, case-insensitive substring
  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Budget Filter logic (TAMS-10): inclusive numeric boundaries
  const hasMinBudget = appliedBudget.min !== null && appliedBudget.min !== undefined && !isNaN(appliedBudget.min);
  const hasMaxBudget = appliedBudget.max !== null && appliedBudget.max !== undefined && !isNaN(appliedBudget.max);

  // Combine Destination Search + Budget Range
  const filteredPackages = displayPackages.filter((pkg) => {
    // 1. Destination filter
    if (trimmedQuery && !(pkg.destination || '').toLowerCase().includes(trimmedQuery)) {
      return false;
    }

    // 2. Budget filter
    const pkgPrice = typeof pkg.price === 'number' ? pkg.price : Number(pkg.price);
    if (!isNaN(pkgPrice)) {
      if (hasMinBudget && pkgPrice < appliedBudget.min) {
        return false;
      }
      if (hasMaxBudget && pkgPrice > appliedBudget.max) {
        return false;
      }
    }

    return true;
  });

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (val && val.trim()) {
        url.searchParams.set('search', val.trim());
      } else {
        url.searchParams.delete('search');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearchChange) onSearchChange('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('search');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleApplyBudget = ({ min, max }) => {
    setAppliedBudget({ min, max });
    if (onBudgetChange) onBudgetChange({ min, max });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (min !== null && min !== undefined) {
        url.searchParams.set('minBudget', String(min));
      } else {
        url.searchParams.delete('minBudget');
      }
      if (max !== null && max !== undefined) {
        url.searchParams.set('maxBudget', String(max));
      } else {
        url.searchParams.delete('maxBudget');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleClearBudget = () => {
    setAppliedBudget({ min: null, max: null });
    if (onBudgetChange) onBudgetChange({ min: null, max: null });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('minBudget');
      url.searchParams.delete('maxBudget');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setAppliedBudget({ min: null, max: null });
    if (onSearchChange) onSearchChange('');
    if (onBudgetChange) onBudgetChange({ min: null, max: null });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('search');
      url.searchParams.delete('minBudget');
      url.searchParams.delete('maxBudget');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const hasAnyFilterActive = Boolean(trimmedQuery || hasMinBudget || hasMaxBudget);

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

        {/* Search & Budget Filter Toolbar (TAMS-24, TAMS-25, TAMS-10) */}
        <div className="section-toolbar" role="region" aria-label="Search and filter travel packages">
          <div className="section-search-bar">
            <DestinationSearch 
              value={searchQuery}
              onChange={handleSearchChange}
              onSearch={handleSearchChange}
              onClear={handleClearSearch}
            />

            {/* Popular Destination Quick Filter Chips */}
            {availableDestinations.length > 0 && (
              <div className="destination-quick-pills" role="group" aria-label="Quick destination filters">
                <span className="quick-filter-label">Quick Destination Filters:</span>
                <div className="quick-pills-list">
                  <button
                    type="button"
                    className={`destination-chip ${!trimmedQuery ? 'is-active' : ''}`}
                    onClick={handleClearSearch}
                    aria-pressed={!trimmedQuery}
                  >
                    All Destinations
                  </button>
                  {availableDestinations.map((dest) => {
                    const isSelected = trimmedQuery === dest.toLowerCase();
                    return (
                      <button
                        key={dest}
                        type="button"
                        className={`destination-chip ${isSelected ? 'is-active' : ''}`}
                        onClick={() => handleSearchChange(isSelected ? '' : dest)}
                        aria-pressed={isSelected}
                      >
                        {dest}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="section-budget-filter">
            <BudgetFilter 
              minBudget={appliedBudget.min}
              maxBudget={appliedBudget.max}
              onApply={handleApplyBudget}
              onClear={handleClearBudget}
            />
          </div>
        </div>

        {/* Dynamic Filter Status Bar */}
        {hasAnyFilterActive && !isLoading && !effectiveError && displayPackages.length > 0 && (
          <div className="filter-status-bar" aria-live="polite">
            <span className="filter-count">
              Showing {filteredPackages.length} of {displayPackages.length} package{displayPackages.length === 1 ? '' : 's'}
            </span>
            <div className="filter-active-tags">
              {trimmedQuery && (
                <span className="filter-pill-tag">
                  Destination: &quot;{searchQuery.trim()}&quot;
                  <button
                    type="button"
                    className="filter-pill-remove"
                    onClick={handleClearSearch}
                    aria-label="Remove destination filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {(hasMinBudget || hasMaxBudget) && (
                <span className="filter-pill-tag">
                  Budget: ₹{hasMinBudget ? appliedBudget.min.toLocaleString('en-IN') : '0'} – {hasMaxBudget ? `₹${appliedBudget.max.toLocaleString('en-IN')}` : 'Any'}
                  <button
                    type="button"
                    className="filter-pill-remove"
                    onClick={handleClearBudget}
                    aria-label="Remove budget filter"
                  >
                    ×
                  </button>
                </span>
              )}
              <button 
                type="button" 
                className="filter-reset-link" 
                onClick={handleResetAllFilters}
              >
                Reset all
              </button>
            </div>
          </div>
        )}

        {/* Dynamic State Rendering: Loading -> Error -> Empty Catalog -> Empty Filter Results -> Grid */}
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
          trimmedQuery && (hasMinBudget || hasMaxBudget) ? (
            <EmptyState 
              title="No packages found matching your criteria."
              subtitle={`We couldn't find any packages matching destination "${searchQuery.trim()}" within your budget of ₹${hasMinBudget ? appliedBudget.min.toLocaleString('en-IN') : '0'} to ${hasMaxBudget ? `₹${appliedBudget.max.toLocaleString('en-IN')}` : 'unlimited'}. Try widening your filters.`}
              buttonText="Reset All Filters"
              onReset={handleResetAllFilters}
            />
          ) : hasMinBudget || hasMaxBudget ? (
            <EmptyState 
              title="No packages found for this budget range."
              subtitle={`We couldn't find any travel packages in the budget range ₹${hasMinBudget ? appliedBudget.min.toLocaleString('en-IN') : '0'} to ${hasMaxBudget ? `₹${appliedBudget.max.toLocaleString('en-IN')}` : 'unlimited'}. Try adjusting or clearing your budget filters.`}
              buttonText="Clear Budget Filters"
              onReset={handleClearBudget}
            />
          ) : (
            <EmptyState 
              title="No packages found for this destination."
              subtitle={`We couldn't find any travel packages matching "${searchQuery.trim()}". Try searching for another destination or clear your search to view all trips.`}
              buttonText="Clear Search"
              onReset={handleClearSearch}
            />
          )
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

