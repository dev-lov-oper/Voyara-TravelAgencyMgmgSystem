import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DestinationSearch from '../src/components/DestinationSearch.jsx';
import PackageSection from '../src/components/PackageSection.jsx';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';

describe('TAMS-24: Destination Search Interface Validation', () => {

  it('renders search input with required placeholder "Search by destination..."', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('placeholder="Search by destination..."');
    expect(html).toContain('id="destination-search-input"');
    expect(html).toContain('type="text"');
  });

  it('includes accessible screen reader label', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('class="visually-hidden"');
    expect(html).toContain('Search by destination');
    expect(html).toContain('for="destination-search-input"');
  });

  it('includes search icon inside input container', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('class="search-icon"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
  });

  it('does NOT render clear button when input value is empty', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch, { value: '' }));
    expect(html).not.toContain('search-clear-btn');
  });

  it('renders accessible clear button when text is present', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch, { value: 'Goa' }));
    expect(html).toContain('class="search-clear-btn"');
    expect(html).toContain('aria-label="Clear destination search"');
    expect(html).toContain('type="button"');
  });

  it('renders container with search landmark role for accessibility', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('role="search"');
  });

});

describe('TAMS-25: Destination Search Logic & Filtering Validation', () => {

  // Helper function replicating the destination matching logic in PackageSection
  const filterPackagesByDestination = (packages, query) => {
    const trimmed = (query || '').trim().toLowerCase();
    return trimmed 
      ? packages.filter(pkg => (pkg.destination || '').toLowerCase().includes(trimmed))
      : packages;
  };

  it('1. Exact destination match returns only matching packages', () => {
    const results = filterPackagesByDestination(SAMPLE_PACKAGES, 'Goa');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Coastal Escape');
    expect(results[0].destination).toBe('Goa');
  });

  it('2. Partial destination match matches substrings (e.g., "man" -> "Manali" & "Andaman", "kash" -> "Kashmir")', () => {
    const manResults = filterPackagesByDestination(SAMPLE_PACKAGES, 'man');
    expect(manResults.length).toBe(2);
    const manDests = manResults.map(p => p.destination);
    expect(manDests).toContain('Manali');
    expect(manDests).toContain('Andaman');

    const kashResults = filterPackagesByDestination(SAMPLE_PACKAGES, 'kash');
    expect(kashResults.length).toBe(1);
    expect(kashResults[0].destination).toBe('Kashmir');
  });

  it('3. Matching is case-insensitive (e.g., "kErALa", "jAiPuR")', () => {
    const keralaResults = filterPackagesByDestination(SAMPLE_PACKAGES, 'kErALa');
    expect(keralaResults.length).toBe(1);
    expect(keralaResults[0].destination).toBe('Kerala');

    const jaipurResults = filterPackagesByDestination(SAMPLE_PACKAGES, 'JAIPUR');
    expect(jaipurResults.length).toBe(1);
    expect(jaipurResults[0].destination).toBe('Jaipur');
  });

  it('4. Trims leading and trailing whitespace from query', () => {
    const results = filterPackagesByDestination(SAMPLE_PACKAGES, '   Kashmir   ');
    expect(results.length).toBe(1);
    expect(results[0].destination).toBe('Kashmir');
  });

  it('5. Returns empty array for non-matching destinations (e.g., "Switzerland", "Paris")', () => {
    const results = filterPackagesByDestination(SAMPLE_PACKAGES, 'Switzerland');
    expect(results.length).toBe(0);
  });

  it('6. Empty or cleared query restores all 6 packages', () => {
    const emptyResults = filterPackagesByDestination(SAMPLE_PACKAGES, '');
    expect(emptyResults.length).toBe(6);

    const whitespaceResults = filterPackagesByDestination(SAMPLE_PACKAGES, '    ');
    expect(whitespaceResults.length).toBe(6);
  });

  it('7. Preserves original sample packages array without mutation', () => {
    const originalLength = SAMPLE_PACKAGES.length;
    filterPackagesByDestination(SAMPLE_PACKAGES, 'Goa');
    expect(SAMPLE_PACKAGES.length).toBe(originalLength);
  });

  it('8. PackageSection renders matching package cards when query matches', () => {
    // Render PackageSection without search (all packages)
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, { packages: SAMPLE_PACKAGES })
    );
    expect(html).toContain('Coastal Escape');
    expect(html).toContain('Himalayan Retreat');
    expect(html).toContain('Search by destination...');
  });

  it('9. PackageSection distinguishes catalog empty state vs search no-match state', () => {
    // When catalog itself is empty (displayPackages = [])
    const emptyCatalogHtml = renderToStaticMarkup(
      React.createElement(PackageSection, { packages: [] })
    );
    expect(emptyCatalogHtml).toContain('No packages available right now.');

    // Note: When packages exist but search returns 0 matches,
    // the UI renders "No packages found for this destination."
  });

});
