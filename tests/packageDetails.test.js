import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PackageDetails from '../src/components/PackageDetails.jsx';
import App from '../src/App.jsx';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';
import { getPackageById, normalizePackage } from '../src/services/packageService.js';

describe('TAMS-11: Package Details Interface Validation', () => {

  const sampleGoa = SAMPLE_PACKAGES.find(p => p.id === 'pkg-1');
  const sampleJaipur = SAMPLE_PACKAGES.find(p => p.id === 'pkg-3'); // Intentionally minimal (tests missing optional info)

  it('1. Renders package title, destination, duration, price, and description', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleGoa, onBack: () => {} })
    );

    // Title & destination
    expect(html).toContain('Coastal Escape');
    expect(html).toContain('Goa');
    expect(html).toContain('details-destination-tagline');

    // Duration & price
    expect(html).toContain('4 days');
    expect(html).toContain('₹12,999');

    // Description
    expect(html).toContain('Relax along sun-drenched golden beaches');
  });

  it('2. Renders main destination image with appropriate alt text', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('class="details-hero-image"');
    expect(html).toContain('src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2');
    expect(html).toContain('alt="Scenic sunny beach lined with palm trees in Goa"');
  });

  it('3. Renders day-by-day itinerary when available', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('Day-by-Day Itinerary');
    expect(html).toContain('Day 1');
    expect(html).toContain('Arrival in Goa &amp; Sunset Beach Walk');
    expect(html).toContain('Day 2');
    expect(html).toContain('Old Goa Heritage &amp; Fontainhas Latin Quarter');
    expect(html).toContain('Day 3');
    expect(html).toContain('Arabian Sea Dolphin Cruise &amp; Beach Shacks');
    expect(html).toContain('Day 4');
    expect(html).toContain('Leisure Breakfast &amp; Departure');
  });

  it('4. Renders package inclusions and exclusions when available', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleGoa, onBack: () => {} })
    );

    // Inclusions
    expect(html).toContain("What&#x27;s Included");
    expect(html).toContain('3 nights boutique resort accommodation in North Goa');
    expect(html).toContain('Daily buffet breakfast and welcome cocktail');
    expect(html).toContain('Private roundtrip airport or railway station transfers');

    // Exclusions
    expect(html).toContain("What&#x27;s Not Included");
    expect(html).toContain('Flight or train fare to and from Goa');
    expect(html).toContain('Water sports activities and scuba diving fees');
  });

  it('5. Handles missing optional itinerary and inclusions gracefully (e.g. Jaipur package)', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleJaipur, onBack: () => {} })
    );

    // Essential info is still rendered
    expect(html).toContain('Royal Heritage');
    expect(html).toContain('Jaipur');
    expect(html).toContain('3 days');
    expect(html).toContain('₹8,999');

    // Fallback notes are displayed gracefully without fabricating activities or assuming inclusions
    expect(html).toContain('Itinerary details for this package are currently unavailable');
    expect(html).toContain('No specific inclusions listed for this package');
    // Exclusions section should be omitted if no exclusions are present
    expect(html).not.toContain("What&#x27;s Not Included");
  });

  it('6. Renders clear return navigation actions (breadcrumbs and Back button)', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: sampleGoa, onBack: () => {} })
    );

    expect(html).toContain('id="back-to-listing-link"');
    expect(html).toContain('Back to Packages');
    expect(html).toContain('class="details-breadcrumbs"');
    expect(html).toContain('Return to Package Listing');
  });

  it('7. Displays appropriate "Package Not Found" message for invalid package identifiers', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: null, onBack: () => {} })
    );

    expect(html).toContain('Package Not Found');
    expect(html).toContain("We couldn&#x27;t find the travel package you&#x27;re looking for.");
    expect(html).toContain('id="back-to-listing-btn"');
    expect(html).toContain('← Back to All Packages');
  });

  it('8. Renders loading skeleton state during asynchronous package retrieval', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { isLoading: true, onBack: () => {} })
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('is-loading');
    expect(html).toContain('details-skeleton-hero');
  });

  it('9. Renders error message with retry option when retrieval fails', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, {
        error: 'Failed to fetch package details',
        onRetry: () => {},
        onBack: () => {},
      })
    );

    expect(html).toContain('Unable to Load Package Details');
    expect(html).toContain('Failed to fetch package details');
    expect(html).toContain('Try Again');
    expect(html).toContain('Back to Packages');
  });

});

describe('TAMS-11: Service Layer getPackageById Validation', () => {

  it('retrieves and normalizes an existing package by ID', async () => {
    const pkg = await getPackageById('pkg-2', { forceMock: true });
    expect(pkg).not.toBeNull();
    expect(pkg.id).toBe('pkg-2');
    expect(pkg.title).toBe('Himalayan Retreat');
    expect(pkg.destination).toBe('Manali');
    expect(pkg.price).toBe(18499);
    expect(pkg.itinerary.length).toBe(5);
    expect(pkg.inclusions.length).toBeGreaterThan(0);
    expect(pkg.exclusions.length).toBeGreaterThan(0);
  });

  it('returns null when querying an invalid or non-existent package ID', async () => {
    const invalidPkg = await getPackageById('pkg-nonexistent-999', { forceMock: true });
    expect(invalidPkg).toBeNull();

    const emptyId = await getPackageById('', { forceMock: true });
    expect(emptyId).toBeNull();
  });

  it('safely normalizes packages with string or object itinerary items', () => {
    const raw = {
      id: 'pkg-custom',
      title: 'Custom Tour',
      itinerary: ['Day 1: Arrival', 'Day 2: City tour'],
      inclusions: ['Breakfast'],
      exclusions: ['Flights']
    };

    const normalized = normalizePackage(raw);
    expect(normalized.itinerary.length).toBe(2);
    expect(normalized.itinerary[0].day).toBe(1);
    expect(normalized.itinerary[0].description).toBe('Day 1: Arrival');
    expect(normalized.inclusions).toEqual(['Breakfast']);
    expect(normalized.exclusions).toEqual(['Flights']);
  });

});

describe('TAMS-11: App View Routing & Listing Preservation', () => {

  it('renders package listing, search bar, and budget filter when no package is selected', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    // Listing is visible
    expect(html).toContain('Explore Travel Packages');
    expect(html).toContain('Search by destination...');
    expect(html).toContain('Minimum Budget (₹)');
    expect(html).toContain('Maximum Budget (₹)');

    // Details view is not rendered
    expect(html).not.toContain('class="package-details-page"');
  });

});

describe('TAMS-31: Itinerary and Inclusions Detailed Validation', () => {

  it('sorts itinerary days in chronological order even if data is out of order', () => {
    const unorderedPkg = {
      id: 'pkg-unordered',
      title: 'Unordered Tour',
      destination: 'Varanasi',
      price: 15000,
      duration: 3,
      itinerary: [
        { day: 3, title: 'Day Three Finale', description: 'Ganga Aarti' },
        { day: 1, title: 'Day One Arrival', description: 'Check-in and evening stroll' },
        { day: 2, title: 'Day Two Temples', description: 'Kashi Vishwanath visit' },
      ],
      inclusions: ['Hotel stay', 'Temple guide'],
    };

    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: unorderedPkg, onBack: () => {} })
    );

    const idxDay1 = html.indexOf('Day One Arrival');
    const idxDay2 = html.indexOf('Day Two Temples');
    const idxDay3 = html.indexOf('Day Three Finale');

    expect(idxDay1).toBeGreaterThan(-1);
    expect(idxDay2).toBeGreaterThan(-1);
    expect(idxDay3).toBeGreaterThan(-1);
    expect(idxDay1).toBeLessThan(idxDay2);
    expect(idxDay2).toBeLessThan(idxDay3);
  });

  it('supports packages with different itinerary lengths (5-day Manali & 6-day Kerala)', () => {
    const manaliPkg = SAMPLE_PACKAGES.find(p => p.id === 'pkg-2');
    const keralaPkg = SAMPLE_PACKAGES.find(p => p.id === 'pkg-4');

    const htmlManali = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: manaliPkg, onBack: () => {} })
    );
    expect(htmlManali).toContain('5 Days Schedule');
    expect(htmlManali).toContain('Day 5');
    expect(htmlManali).toContain('Farewell Manali');

    const htmlKerala = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: keralaPkg, onBack: () => {} })
    );
    expect(htmlKerala).toContain('6 Days Schedule');
    expect(htmlKerala).toContain('Day 6');
    expect(htmlKerala).toContain('Cochin City Tour &amp; Departure');
  });

  it('renders package inclusions as an accessible list', () => {
    const manaliPkg = SAMPLE_PACKAGES.find(p => p.id === 'pkg-2');
    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: manaliPkg, onBack: () => {} })
    );

    expect(html).toContain('What&#x27;s Included');
    expect(html).toContain('role="list" aria-label="Package inclusions"');
    expect(html).toContain('4 nights cedar-view lodge accommodation');
    expect(html).toContain('Daily breakfast and four-course mountain dinners');
  });

  it('handles empty inclusions and missing itinerary gracefully without fabricated content', () => {
    const emptyPkg = {
      id: 'pkg-empty',
      title: 'Bare Minimum Package',
      destination: 'Hampi',
      itinerary: [],
      inclusions: [],
      exclusions: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: emptyPkg, onBack: () => {} })
    );

    expect(html).toContain('Itinerary details for this package are currently unavailable');
    expect(html).toContain('No specific inclusions listed for this package');
    expect(html).not.toContain('What&#x27;s Not Included');
  });

  it('handles undefined or null itinerary and inclusions gracefully', () => {
    const nullPkg = {
      id: 'pkg-null-props',
      title: 'Null Fields Package',
      destination: 'Pondicherry',
      itinerary: null,
      inclusions: null,
      exclusions: null,
    };

    const html = renderToStaticMarkup(
      React.createElement(PackageDetails, { pkg: nullPkg, onBack: () => {} })
    );

    expect(html).toContain('Itinerary details for this package are currently unavailable');
    expect(html).toContain('No specific inclusions listed for this package');
    expect(html).not.toContain('What&#x27;s Not Included');
  });

});

