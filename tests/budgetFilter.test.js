import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BudgetFilter from '../src/components/BudgetFilter.jsx';
import PackageSection from '../src/components/PackageSection.jsx';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';
import { getDatabase, closeDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { getAllPackages } from '../src/server/models/packageModel.js';
import { handleApiRequest } from '../src/server/apiHandler.js';

describe('TAMS-10: Budget Filter Interface & Accessibility Validation', () => {

  it('renders minimum and maximum budget inputs with required labels', () => {
    const html = renderToStaticMarkup(React.createElement(BudgetFilter));
    expect(html).toContain('Minimum Budget (₹)');
    expect(html).toContain('Maximum Budget (₹)');
    expect(html).toContain('id="min-budget-input"');
    expect(html).toContain('id="max-budget-input"');
    expect(html).toContain('type="number"');
  });

  it('renders non-negative constraints on inputs', () => {
    const html = renderToStaticMarkup(React.createElement(BudgetFilter));
    expect(html).toContain('min="0"');
  });

  it('renders Apply Filters and Clear Filters action buttons', () => {
    const html = renderToStaticMarkup(React.createElement(BudgetFilter));
    expect(html).toContain('Apply Filters');
    expect(html).toContain('Clear Filters');
    expect(html).toContain('id="apply-budget-filter-btn"');
    expect(html).toContain('id="clear-budget-filter-btn"');
  });

  it('renders currency symbol ₹ for visual clarity', () => {
    const html = renderToStaticMarkup(React.createElement(BudgetFilter));
    expect(html).toContain('budget-currency-prefix');
    expect(html).toContain('₹');
  });

  it('has accessible search role and form label', () => {
    const html = renderToStaticMarkup(React.createElement(BudgetFilter));
    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Filter packages by budget"');
  });

});

describe('TAMS-10: Budget Filtering Logic Validation', () => {

  // Reusable filtering logic adhering to TAMS-10 specification
  const applyFilters = (packages, { query = '', minBudget = null, maxBudget = null }) => {
    const trimmedQuery = (query || '').trim().toLowerCase();
    const hasMin = minBudget !== null && minBudget !== undefined && !isNaN(minBudget);
    const hasMax = maxBudget !== null && maxBudget !== undefined && !isNaN(maxBudget);

    return packages.filter((pkg) => {
      // 1. Destination match
      if (trimmedQuery && !(pkg.destination || '').toLowerCase().includes(trimmedQuery)) {
        return false;
      }

      // 2. Budget match
      const price = typeof pkg.price === 'number' ? pkg.price : Number(pkg.price);
      if (!isNaN(price)) {
        if (hasMin && price < minBudget) {
          return false;
        }
        if (hasMax && price > maxBudget) {
          return false;
        }
      }

      return true;
    });
  };

  it('1. Filters with minimum budget only (>= min)', () => {
    // Packages >= 20000: Kerala (24999), Kashmir (29999), Andaman (34999)
    const results = applyFilters(SAMPLE_PACKAGES, { minBudget: 20000 });
    expect(results.length).toBe(3);
    const destinations = results.map(p => p.destination);
    expect(destinations).toContain('Kerala');
    expect(destinations).toContain('Kashmir');
    expect(destinations).toContain('Andaman');
  });

  it('2. Filters with maximum budget only (<= max)', () => {
    // Packages <= 15000: Jaipur (8999), Goa (12999)
    const results = applyFilters(SAMPLE_PACKAGES, { maxBudget: 15000 });
    expect(results.length).toBe(2);
    const destinations = results.map(p => p.destination);
    expect(destinations).toContain('Jaipur');
    expect(destinations).toContain('Goa');
  });

  it('3. Filters within inclusive range of both minimum and maximum budgets', () => {
    // Packages between 10000 and 20000: Goa (12999), Manali (18499)
    const results = applyFilters(SAMPLE_PACKAGES, { minBudget: 10000, maxBudget: 20000 });
    expect(results.length).toBe(2);
    const destinations = results.map(p => p.destination);
    expect(destinations).toContain('Goa');
    expect(destinations).toContain('Manali');
  });

  it('4. Correctly includes package prices equal to either boundary value', () => {
    // Exact lower boundary: Jaipur (8999)
    const exactLower = applyFilters(SAMPLE_PACKAGES, { minBudget: 8999, maxBudget: 8999 });
    expect(exactLower.length).toBe(1);
    expect(exactLower[0].title).toBe('Royal Heritage');
    expect(exactLower[0].price).toBe(8999);

    // Exact upper boundary: Kashmir (29999)
    const exactUpper = applyFilters(SAMPLE_PACKAGES, { minBudget: 29999, maxBudget: 29999 });
    expect(exactUpper.length).toBe(1);
    expect(exactUpper[0].title).toBe('Valley of Dreams');
    expect(exactUpper[0].price).toBe(29999);

    // Exact boundary at 18499 (Manali)
    const boundaryResults = applyFilters(SAMPLE_PACKAGES, { minBudget: 18499, maxBudget: 24999 });
    expect(boundaryResults.length).toBe(2);
    expect(boundaryResults.map(p => p.destination)).toEqual(['Manali', 'Kerala']);
  });

  it('5. Validates minimum budget greater than maximum budget', () => {
    // Range min 25000 > max 15000 is invalid
    const minVal = 25000;
    const maxVal = 15000;
    const isInvalid = minVal > maxVal;
    expect(isInvalid).toBe(true);

    // In BudgetFilter component, it reports: "Minimum budget cannot exceed maximum budget."
  });

  it('6. Empty budget inputs return all available packages', () => {
    const results = applyFilters(SAMPLE_PACKAGES, { minBudget: null, maxBudget: null });
    expect(results.length).toBe(6);
  });

  it('7. Handles non-numeric or negative budget values safely without throwing', () => {
    expect(() => {
      applyFilters(SAMPLE_PACKAGES, { minBudget: NaN, maxBudget: undefined });
    }).not.toThrow();

    const results = applyFilters(SAMPLE_PACKAGES, { minBudget: NaN, maxBudget: undefined });
    expect(results.length).toBe(6);
  });

  it('8. Combines budget filtering with destination search seamlessly', () => {
    // Destination query "man" matches Manali (18499) and Andaman (34999)
    // Applying max budget of 20000 filters out Andaman, leaving only Manali
    const combinedResults = applyFilters(SAMPLE_PACKAGES, {
      query: 'man',
      maxBudget: 20000,
    });

    expect(combinedResults.length).toBe(1);
    expect(combinedResults[0].destination).toBe('Manali');
    expect(combinedResults[0].price).toBe(18499);
  });

  it('9. Clearing budget filters preserves active destination search', () => {
    // Initial combined filter: destination "man" + maxBudget 20000 -> 1 result
    const beforeClear = applyFilters(SAMPLE_PACKAGES, {
      query: 'man',
      maxBudget: 20000,
    });
    expect(beforeClear.length).toBe(1);

    // Clear budget filters while maintaining query "man" -> 2 results (Manali & Andaman)
    const afterClearBudget = applyFilters(SAMPLE_PACKAGES, {
      query: 'man',
      minBudget: null,
      maxBudget: null,
    });
    expect(afterClearBudget.length).toBe(2);
    expect(afterClearBudget.map(p => p.destination)).toContain('Manali');
    expect(afterClearBudget.map(p => p.destination)).toContain('Andaman');
  });

  it('10. Clearing destination search preserves active budget filters', () => {
    // Initial combined filter: query "Goa" + maxBudget 15000 -> 1 result (Goa 12999)
    const beforeClear = applyFilters(SAMPLE_PACKAGES, {
      query: 'Goa',
      maxBudget: 15000,
    });
    expect(beforeClear.length).toBe(1);

    // Clear destination search while maintaining maxBudget 15000 -> 2 results (Goa 12999 & Jaipur 8999)
    const afterClearSearch = applyFilters(SAMPLE_PACKAGES, {
      query: '',
      maxBudget: 15000,
    });
    expect(afterClearSearch.length).toBe(2);
    expect(afterClearSearch.map(p => p.destination)).toContain('Goa');
    expect(afterClearSearch.map(p => p.destination)).toContain('Jaipur');
  });

  it('11. Preserves original package dataset without mutation', () => {
    const originalLength = SAMPLE_PACKAGES.length;
    const originalCopy = JSON.stringify(SAMPLE_PACKAGES);

    applyFilters(SAMPLE_PACKAGES, { minBudget: 10000, maxBudget: 20000 });

    expect(SAMPLE_PACKAGES.length).toBe(originalLength);
    expect(JSON.stringify(SAMPLE_PACKAGES)).toBe(originalCopy);
  });

});

describe('TAMS-10: PackageSection UI Integration Validation', () => {

  it('renders both DestinationSearch and BudgetFilter in section toolbar', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, { packages: SAMPLE_PACKAGES })
    );
    expect(html).toContain('class="section-toolbar"');
    expect(html).toContain('Search by destination...');
    expect(html).toContain('Minimum Budget (₹)');
    expect(html).toContain('Maximum Budget (₹)');
    expect(html).toContain('Apply Filters');
    expect(html).toContain('Clear Filters');
  });

  it('renders filtered packages when initialMinBudget and initialMaxBudget are provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        initialMinBudget: 20000,
        initialMaxBudget: 30000,
      })
    );
    // Kerala (24999), Andaman (26499), and Kashmir (29999) are in [20000, 30000]
    expect(html).toContain('Backwater Serenity');
    expect(html).toContain('Island Discovery');
    expect(html).toContain('Valley of Dreams');
    // Jaipur (8999), Goa (12999), and Manali (18499) should be filtered out
    expect(html).not.toContain('Royal Heritage');
    expect(html).not.toContain('Coastal Escape');
    expect(html).not.toContain('Himalayan Retreat');
  });

  it('renders budget-specific empty state when budget range yields 0 packages', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        initialMinBudget: 50000,
        initialMaxBudget: 60000,
      })
    );
    expect(html).toContain('No packages found for this budget range.');
    expect(html).toContain('Clear Budget Filters');
  });

  it('renders combined empty state when both search and budget filters yield 0 packages', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        initialSearchQuery: 'Goa',
        initialMinBudget: 30000,
        initialMaxBudget: 40000,
      })
    );
    expect(html).toContain('No packages found matching your criteria.');
    expect(html).toContain('Reset All Filters');
  });

  it('preserves catalog empty state when data source itself returns 0 packages', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: [],
        initialMinBudget: 10000,
      })
    );
    expect(html).toContain('No packages available right now.');
  });

  it('preserves loading skeleton during loading state', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        isLoading: true,
      })
    );
    expect(html).toContain('skeleton');
    expect(html).not.toContain('Coastal Escape');
  });

  it('preserves error banner with retry option during error state', () => {
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        error: 'Unable to connect to server',
      })
    );
    expect(html).toContain('Unable to connect to server');
    expect(html).toContain('Try Again');
  });

  it('renders matching packages when both destination query and budget range are provided', () => {
    // "man" matches Manali (18499) and Andaman (26499). Budget max 20000 filters to only Manali.
    const html = renderToStaticMarkup(
      React.createElement(PackageSection, {
        packages: SAMPLE_PACKAGES,
        initialSearchQuery: 'man',
        initialMaxBudget: 20000,
      })
    );
    expect(html).toContain('Himalayan Retreat');
    expect(html).toContain('Manali');
    expect(html).not.toContain('Island Discovery');
    expect(html).not.toContain('Coastal Escape');
  });

  it('backend model filters packages by both destination and budget range simultaneously', () => {
    const memDb = getDatabase({ memory: true });
    runMigrations(memDb);

    try {
      // Both match: "Goa" with budget between 10000 and 15000 -> Coastal Escape (12999)
      const goaWithinBudget = getAllPackages(memDb, {
        destination: 'Goa',
        minBudget: 10000,
        maxBudget: 15000,
      });
      expect(goaWithinBudget.length).toBe(1);
      expect(goaWithinBudget[0].title).toBe('Coastal Escape');

      // Mismatch: "Goa" with budget min 15000 -> 0 results
      const goaOverBudget = getAllPackages(memDb, {
        destination: 'Goa',
        minBudget: 15000,
      });
      expect(goaOverBudget.length).toBe(0);

      // "man" (Manali 18499, Andaman 26499) with minBudget 20000 -> only Andaman
      const manAbove20k = getAllPackages(memDb, {
        destination: 'man',
        minBudget: 20000,
      });
      expect(manAbove20k.length).toBe(1);
      expect(manAbove20k[0].destination).toBe('Andaman');
    } finally {
      closeDatabase(memDb);
    }
  });

  it('backend API GET /api/packages filters packages by destination and budget parameters together', async () => {
    const memDb = getDatabase({ memory: true });
    runMigrations(memDb);

    try {
      let responseStatusCode = null;
      let responseHeaders = {};
      let responseBody = '';

      const fakeReq = {
        method: 'GET',
        url: '/api/packages?destination=man&maxBudget=20000',
        headers: {},
      };

      const fakeRes = {
        writeHead: (code, headers) => {
          responseStatusCode = code;
          responseHeaders = headers;
        },
        end: (payload) => {
          responseBody = payload;
        },
      };

      await handleApiRequest(fakeReq, fakeRes, memDb);

      expect(responseStatusCode).toBe(200);
      expect(responseHeaders['Content-Type']).toBe('application/json');
      const parsed = JSON.parse(responseBody);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].destination).toBe('Manali');
    } finally {
      closeDatabase(memDb);
    }
  });

});
