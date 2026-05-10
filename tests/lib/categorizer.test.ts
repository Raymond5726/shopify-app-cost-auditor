import { describe, it, expect } from 'vitest';
import {
  getCategoryLabel,
  detectRedundancies,
  calculateTotalMonthlyCost,
  calculatePotentialSavings,
} from '../../src/lib/categorizer';
import type { ShopifyApp, RedundancyGroup } from '../../src/types';

// ---- Factory helpers ----

function makeApp(overrides: Partial<ShopifyApp> = {}): ShopifyApp {
  return {
    id: overrides.id ?? 'app-1',
    name: overrides.name ?? 'Test App',
    handle: overrides.handle ?? 'test-app',
    monthlyCost: overrides.monthlyCost ?? 10,
    detectedVia: overrides.detectedVia ?? 'network',
    isActive: overrides.isActive ?? true,
    category: overrides.category,
    ...overrides,
  };
}

// ---- getCategoryLabel ----

describe('getCategoryLabel', () => {
  it('returns the correct label for known categories', () => {
    expect(getCategoryLabel('email-marketing')).toBe('Email Marketing');
    expect(getCategoryLabel('reviews')).toBe('Product Reviews');
    expect(getCategoryLabel('seo')).toBe('SEO Optimization');
    expect(getCategoryLabel('chat')).toBe('Live Chat & Support');
  });

  it('returns "Other" for the "other" category', () => {
    expect(getCategoryLabel('other')).toBe('Other');
  });

  it('returns "Other" for an unknown category value', () => {
    // Force a non-standard string through the typed parameter
    expect(getCategoryLabel('nonexistent' as never)).toBe('Other');
  });
});

// ---- detectRedundancies ----

describe('detectRedundancies', () => {
  it('returns empty array when no apps share a category', () => {
    const apps = [
      makeApp({ category: 'seo', name: 'SEO App' }),
      makeApp({ category: 'chat', name: 'Chat App' }),
    ];
    expect(detectRedundancies(apps)).toEqual([]);
  });

  it('returns a group when two apps share a category', () => {
    const apps = [
      makeApp({ category: 'reviews', name: 'App A', monthlyCost: 15 }),
      makeApp({ category: 'reviews', name: 'App B', monthlyCost: 10 }),
    ];
    const groups = detectRedundancies(apps);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('reviews');
    expect(groups[0].apps).toHaveLength(2);
  });

  it('calculates potentialSavings as totalCost minus cheapest app', () => {
    const apps = [
      makeApp({ category: 'seo', name: 'Expensive', monthlyCost: 30 }),
      makeApp({ category: 'seo', name: 'Cheap', monthlyCost: 5 }),
      makeApp({ category: 'seo', name: 'Mid', monthlyCost: 15 }),
    ];
    const groups = detectRedundancies(apps);
    // total = 30 + 5 + 15 = 50, cheapest = 5, savings = 45
    expect(groups[0].potentialSavings).toBe(45);
  });

  it('skips apps without a category', () => {
    const apps = [
      makeApp({ name: 'No Cat 1', monthlyCost: 10 }),
      makeApp({ name: 'No Cat 2', monthlyCost: 20 }),
    ];
    expect(detectRedundancies(apps)).toEqual([]);
  });

  it('skips apps with category "other"', () => {
    const apps = [
      makeApp({ category: 'other', name: 'Other 1', monthlyCost: 10 }),
      makeApp({ category: 'other', name: 'Other 2', monthlyCost: 20 }),
    ];
    expect(detectRedundancies(apps)).toEqual([]);
  });

  it('skips inactive apps', () => {
    const apps = [
      makeApp({ category: 'reviews', name: 'Active', monthlyCost: 10, isActive: true }),
      makeApp({ category: 'reviews', name: 'Inactive', monthlyCost: 20, isActive: false }),
    ];
    expect(detectRedundancies(apps)).toEqual([]);
  });

  it('sorts groups by potentialSavings descending', () => {
    const apps = [
      makeApp({ category: 'reviews', name: 'R1', monthlyCost: 10 }),
      makeApp({ category: 'reviews', name: 'R2', monthlyCost: 5 }),
      makeApp({ category: 'seo', name: 'S1', monthlyCost: 100 }),
      makeApp({ category: 'seo', name: 'S2', monthlyCost: 5 }),
    ];
    const groups = detectRedundancies(apps);
    expect(groups).toHaveLength(2);
    expect(groups[0].category).toBe('seo'); // savings 95 > savings 5
    expect(groups[1].category).toBe('reviews');
  });

  it('generates recommendation with savings when potentialSavings > 0', () => {
    const apps = [
      makeApp({ category: 'chat', name: 'ChatA', monthlyCost: 20 }),
      makeApp({ category: 'chat', name: 'ChatB', monthlyCost: 5 }),
    ];
    const groups = detectRedundancies(apps);
    expect(groups[0].recommendation).toContain('save $20.00/month');
    expect(groups[0].recommendation).toContain('ChatB');
  });

  it('generates review recommendation when potentialSavings is 0', () => {
    const apps = [
      makeApp({ category: 'shipping', name: 'Ship1', monthlyCost: 0 }),
      makeApp({ category: 'shipping', name: 'Ship2', monthlyCost: 0 }),
    ];
    const groups = detectRedundancies(apps);
    expect(groups[0].recommendation).toContain('Review if all are necessary');
  });
});

// ---- calculateTotalMonthlyCost ----

describe('calculateTotalMonthlyCost', () => {
  it('sums monthlyCost for active apps', () => {
    const apps = [
      makeApp({ monthlyCost: 10, isActive: true }),
      makeApp({ monthlyCost: 25, isActive: true }),
    ];
    expect(calculateTotalMonthlyCost(apps)).toBe(35);
  });

  it('excludes inactive apps', () => {
    const apps = [
      makeApp({ monthlyCost: 10, isActive: true }),
      makeApp({ monthlyCost: 25, isActive: false }),
    ];
    expect(calculateTotalMonthlyCost(apps)).toBe(10);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalMonthlyCost([])).toBe(0);
  });
});

// ---- calculatePotentialSavings ----

describe('calculatePotentialSavings', () => {
  it('sums potentialSavings across groups', () => {
    const groups: RedundancyGroup[] = [
      { category: 'seo', categoryLabel: 'SEO', apps: [], potentialSavings: 20, recommendation: '' },
      { category: 'chat', categoryLabel: 'Chat', apps: [], potentialSavings: 15, recommendation: '' },
    ];
    expect(calculatePotentialSavings(groups)).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(calculatePotentialSavings([])).toBe(0);
  });
});
