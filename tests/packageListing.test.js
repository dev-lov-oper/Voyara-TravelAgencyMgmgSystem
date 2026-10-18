import { describe, it, expect } from 'vitest';
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
      expect(normalized.id).toBe('pkg-test-1');
      expect(normalized.title).toBe('Coastal Escape');
      expect(normalized.destination).toBe('Goa');
      expect(normalized.duration).toBe(4);
      expect(normalized.durationText).toBe('4 days');
      expect(normalized.price).toBe(12999);
      expect(normalized.formattedPrice).toBe('₹12,999');
      expect(normalized.description).toBe('Sunny beach holiday');
      expect(normalized.imageUrl).toBe('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2');
      expect(normalized.category).toBe('Beach & Leisure');
      expect(normalized.isActive).toBe(true);
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
      expect(normalized.id).toBe('api-101');
      expect(normalized.title).toBe('Himalayan Trek');
      expect(normalized.destination).toBe('Manali');
      expect(normalized.duration).toBe(5);
      expect(normalized.durationText).toBe('5 days');
      expect(normalized.price).toBe(18499);
      expect(normalized.formattedPrice).toBe('₹18,499');
      expect(normalized.description).toBe('Alpine mountain pass tour');
      expect(normalized.imageUrl).toBe('https://example.com/manali.jpg');
      expect(normalized.category).toBe('Adventure');
      expect(normalized.isActive).toBe(true);
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
      expect(normalized.isActive).toBe(false);
    });

    it('flags inactive packages when status is not active', () => {
      const inactiveStatusRaw = {
        title: 'Seasonal Tour',
        destination: 'Ladakh',
        status: 'archived'
      };
      const normalized = normalizePackage(inactiveStatusRaw);
      expect(normalized.isActive).toBe(false);
    });
  });

  describe('3. Missing Optional Fields & Crash Prevention', () => {
    it('safely handles null or undefined objects without throwing', () => {
      expect(normalizePackage(null)).toBe(null);
      expect(normalizePackage(undefined)).toBe(null);
      expect(normalizePackage('invalid')).toBe(null);
    });

    it('provides graceful fallbacks for completely empty objects', () => {
      const emptyRaw = {};
      const normalized = normalizePackage(emptyRaw);

      expect(normalized.id.startsWith('pkg-')).toBe(true);
      expect(normalized.title).toBe('Curated Escape');
      expect(normalized.destination).toBe('India');
      expect(normalized.duration).toBe(1);
      expect(normalized.durationText).toBe('1 day');
      expect(normalized.price).toBe(0);
      expect(normalized.formattedPrice).toBe('Inquire for price');
      expect(normalized.description.length > 0).toBe(true);
      expect(normalized.imageUrl.length > 0).toBe(true);
      expect(normalized.category).toBe('Curated Trip');
      expect(normalized.isActive).toBe(true);
    });

    it('formats 1 day duration with singular text', () => {
      const singleDay = { duration: 1 };
      const normalized = normalizePackage(singleDay);
      expect(normalized.durationText).toBe('1 day');
    });

    it('formats multiple day durations with plural text', () => {
      const multiDay = { duration: 6 };
      const normalized = normalizePackage(multiDay);
      expect(normalized.durationText).toBe('6 days');
    });
  });

  describe('4. Sample Illustrative Packages Verification', () => {
    it('verifies all 6 required illustrative packages are present and well-formed', () => {
      expect(SAMPLE_PACKAGES.length).toBe(6);

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
        expect(pkg.title).toBe(exp.title);
        expect(pkg.destination).toBe(exp.destination);
        expect(pkg.duration).toBe(exp.duration);
        expect(pkg.price).toBe(exp.price);
        expect(pkg.imageUrl.startsWith('http')).toBe(true);
        expect(pkg.description.length > 20).toBe(true);
      });
    });
  });

  describe('5. getTravelPackages Behavior', () => {
    it('loads sample packages in mock/fallback mode without throwing', async () => {
      const packages = await getTravelPackages({ forceMock: true });
      expect(packages.length).toBe(6);
      expect(packages[0].title).toBe('Coastal Escape');
      expect(packages[0].formattedPrice).toBe('₹12,999');
    });
  });

});
