import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePackage, getTravelPackages } from '../src/services/packageService.js';
import { SAMPLE_PACKAGES } from '../src/data/packages.js';

describe('TAMS Package Listing & Data Retrieval Validation', () => {

  describe('1. Successful Retrieval & Data Mapping', () => {
    it('correctly maps standard package fields', () => {
      const raw = {
        id: 'pkg-test-1',
        title: 'Coastal Escape',
        destination: 'Goa',
        duration: 4,
        price: 12999,
        description: 'Sunny beach holiday',
        imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
        category: 'Beach & Leisure',
        isActive: true
      };

      const normalized = normalizePackage(raw);
      assert.equal(normalized.id, 'pkg-test-1');
      assert.equal(normalized.title, 'Coastal Escape');
      assert.equal(normalized.destination, 'Goa');
      assert.equal(normalized.duration, 4);
      assert.equal(normalized.durationText, '4 days');
      assert.equal(normalized.price, 12999);
      assert.equal(normalized.formattedPrice, '₹12,999');
      assert.equal(normalized.description, 'Sunny beach holiday');
      assert.equal(normalized.imageUrl, 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2');
      assert.equal(normalized.category, 'Beach & Leisure');
      assert.equal(normalized.isActive, true);
    });

    it('maps alternate backend API property names (e.g., package_name, duration_days, cost, image_url)', () => {
      const rawBackendPayload = {
        package_id: 'api-101',
        package_name: 'Himalayan Trek',
        city: 'Manali',
        duration_days: 5,
        cost: 18499,
        summary: 'Alpine mountain pass tour',
        image_url: 'https://example.com/manali.jpg',
        tag: 'Adventure',
        status: 'active'
      };

      const normalized = normalizePackage(rawBackendPayload);
      assert.equal(normalized.id, 'api-101');
      assert.equal(normalized.title, 'Himalayan Trek');
      assert.equal(normalized.destination, 'Manali');
      assert.equal(normalized.duration, 5);
      assert.equal(normalized.durationText, '5 days');
      assert.equal(normalized.price, 18499);
      assert.equal(normalized.formattedPrice, '₹18,499');
      assert.equal(normalized.description, 'Alpine mountain pass tour');
      assert.equal(normalized.imageUrl, 'https://example.com/manali.jpg');
      assert.equal(normalized.category, 'Adventure');
      assert.equal(normalized.isActive, true);
    });
  });

  describe('2. Active/Available Package Filtering', () => {
    it('flags inactive packages when is_active is false', () => {
      const inactiveRaw = {
        title: 'Archived Tour',
        destination: 'Shimla',
        is_active: false
      };
      const normalized = normalizePackage(inactiveRaw);
      assert.equal(normalized.isActive, false);
    });

    it('flags inactive packages when status is not active', () => {
      const inactiveStatusRaw = {
        title: 'Seasonal Tour',
        destination: 'Ladakh',
        status: 'archived'
      };
      const normalized = normalizePackage(inactiveStatusRaw);
      assert.equal(normalized.isActive, false);
    });
  });

  describe('3. Missing Optional Fields & Crash Prevention', () => {
    it('safely handles null or undefined objects without throwing', () => {
      assert.equal(normalizePackage(null), null);
      assert.equal(normalizePackage(undefined), null);
      assert.equal(normalizePackage('invalid'), null);
    });

    it('provides graceful fallbacks for completely empty objects', () => {
      const emptyRaw = {};
      const normalized = normalizePackage(emptyRaw);

      assert.ok(normalized.id.startsWith('pkg-'));
      assert.equal(normalized.title, 'Curated Escape');
      assert.equal(normalized.destination, 'India');
      assert.equal(normalized.duration, 1);
      assert.equal(normalized.durationText, '1 day');
      assert.equal(normalized.price, 0);
      assert.equal(normalized.formattedPrice, 'Inquire for price');
      assert.ok(normalized.description.length > 0);
      assert.ok(normalized.imageUrl.length > 0);
      assert.equal(normalized.category, 'Curated Trip');
      assert.equal(normalized.isActive, true);
    });

    it('formats 1 day duration with singular text', () => {
      const singleDay = { duration: 1 };
      const normalized = normalizePackage(singleDay);
      assert.equal(normalized.durationText, '1 day');
    });

    it('formats multiple day durations with plural text', () => {
      const multiDay = { duration: 6 };
      const normalized = normalizePackage(multiDay);
      assert.equal(normalized.durationText, '6 days');
    });
  });

  describe('4. Sample Illustrative Packages Verification', () => {
    it('verifies all 6 required illustrative packages are present and well-formed', () => {
      assert.equal(SAMPLE_PACKAGES.length, 6);

      const expected = [
        { title: 'Coastal Escape', destination: 'Goa', duration: 4, price: 12999 },
        { title: 'Himalayan Retreat', destination: 'Manali', duration: 5, price: 18499 },
        { title: 'Royal Heritage', destination: 'Jaipur', duration: 3, price: 8999 },
        { title: 'Backwater Serenity', destination: 'Kerala', duration: 6, price: 24999 },
        { title: 'Valley of Dreams', destination: 'Kashmir', duration: 6, price: 29999 },
        { title: 'Island Discovery', destination: 'Andaman', duration: 5, price: 26499 }
      ];

      expected.forEach((exp, idx) => {
        const pkg = SAMPLE_PACKAGES[idx];
        assert.equal(pkg.title, exp.title);
        assert.equal(pkg.destination, exp.destination);
        assert.equal(pkg.duration, exp.duration);
        assert.equal(pkg.price, exp.price);
        assert.ok(pkg.imageUrl.startsWith('http'));
        assert.ok(pkg.description.length > 20);
      });
    });
  });

  describe('5. getTravelPackages Behavior', () => {
    it('loads sample packages in mock/fallback mode without throwing', async () => {
      const packages = await getTravelPackages({ forceMock: true });
      assert.equal(packages.length, 6);
      assert.equal(packages[0].title, 'Coastal Escape');
      assert.equal(packages[0].formattedPrice, '₹12,999');
    });
  });

});
