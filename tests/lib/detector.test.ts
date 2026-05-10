import { describe, it, expect } from 'vitest';
import {
  mergeDetectedApps,
  matchAppToDatabase,
  enrichWithDatabaseInfo,
} from '../../src/lib/detector';
import type { ShopifyApp, AppDatabaseEntry } from '../../src/types';
import appDatabase from '../../src/data/app-database.json';

// ---- Factory helpers ----

function makePartialApp(overrides: Partial<ShopifyApp> = {}): Partial<ShopifyApp> {
  return {
    name: 'Test App',
    handle: 'test-app',
    ...overrides,
  };
}

function makeFullApp(overrides: Partial<ShopifyApp> = {}): ShopifyApp {
  return {
    id: overrides.id ?? 'app-1',
    name: overrides.name ?? 'Test App',
    handle: overrides.handle ?? 'test-app',
    monthlyCost: overrides.monthlyCost ?? 0,
    detectedVia: overrides.detectedVia ?? 'network',
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}

const miniDatabase: AppDatabaseEntry[] = [
  {
    handle: 'klaviyo-email-marketing',
    name: 'Klaviyo',
    category: 'email-marketing',
    typicalMonthlyPrice: 45,
    aliases: ['Klaviyo Email Marketing', 'Klaviyo SMS'],
  },
  {
    handle: 'judge-me',
    name: 'Judge.me',
    category: 'reviews',
    typicalMonthlyPrice: 15,
    aliases: ['Judge.me Product Reviews', 'Judgeme'],
  },
  {
    handle: 'loox',
    name: 'Loox',
    category: 'reviews',
    typicalMonthlyPrice: 9.99,
    aliases: ['Loox Product Reviews & Photos'],
  },
];

// ---- mergeDetectedApps ----

describe('mergeDetectedApps', () => {
  it('returns full ShopifyApp objects with required defaults', () => {
    const result = mergeDetectedApps([makePartialApp({ name: 'App A' })], []);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('App A');
    expect(result[0].detectedVia).toBe('network');
    expect(result[0].isActive).toBe(true);
    expect(result[0].monthlyCost).toBe(0);
  });

  it('merges network and DOM apps by handle', () => {
    const network = [makePartialApp({ handle: 'my-app', name: 'My App', monthlyCost: 10 })];
    const dom = [makePartialApp({ handle: 'my-app', name: 'My App', icon: 'icon.png' })];
    const result = mergeDetectedApps(network, dom);
    expect(result).toHaveLength(1);
    expect(result[0].detectedVia).toBe('both');
    expect(result[0].monthlyCost).toBe(10); // network priority
    expect(result[0].icon).toBe('icon.png'); // DOM supplements icon
  });

  it('merges by fuzzy name match when handles differ', () => {
    const network = [makePartialApp({ handle: '', name: 'Klaviyo Email Marketing' })];
    const dom = [makePartialApp({ handle: '', name: 'Klaviyo' })];
    const result = mergeDetectedApps(network, dom);
    expect(result).toHaveLength(1);
    expect(result[0].detectedVia).toBe('both');
  });

  it('keeps DOM-only apps that do not match any network app', () => {
    const network = [makePartialApp({ name: 'Network App' })];
    const dom = [makePartialApp({ name: 'Unique DOM App', handle: 'unique-dom' })];
    const result = mergeDetectedApps(network, dom);
    expect(result).toHaveLength(2);
    const domOnly = result.find((a) => a.name === 'Unique DOM App');
    expect(domOnly?.detectedVia).toBe('dom');
  });

  it('handles empty inputs gracefully', () => {
    expect(mergeDetectedApps([], [])).toEqual([]);
  });

  it('skips entries with no name or handle', () => {
    const network = [makePartialApp({ name: undefined, handle: undefined })];
    const result = mergeDetectedApps(network, []);
    // The key would be empty string, and normalize('') is '', so it gets skipped by the `if (key)` check
    expect(result).toHaveLength(0);
  });

  it('network data takes priority over DOM for structured fields', () => {
    const network = [makePartialApp({ handle: 'app', name: 'Network Name', monthlyCost: 25 })];
    const dom = [makePartialApp({ handle: 'app', name: 'DOM Name', monthlyCost: 5 })];
    const result = mergeDetectedApps(network, dom);
    expect(result[0].name).toBe('Network Name');
    expect(result[0].monthlyCost).toBe(25);
  });

  it('DOM supplements icon when network has none', () => {
    const network = [makePartialApp({ handle: 'app' })];
    const dom = [makePartialApp({ handle: 'app', icon: 'https://cdn.example.com/icon.png' })];
    const result = mergeDetectedApps(network, dom);
    expect(result[0].icon).toBe('https://cdn.example.com/icon.png');
  });

  it('deduplicates multiple DOM apps that match the same network app', () => {
    const network = [makePartialApp({ handle: 'klaviyo-email-marketing', name: 'Klaviyo' })];
    const dom = [
      makePartialApp({ handle: 'klaviyo-email-marketing', name: 'Klaviyo', icon: 'a.png' }),
    ];
    const result = mergeDetectedApps(network, dom);
    expect(result).toHaveLength(1);
  });
});

// ---- matchAppToDatabase ----

describe('matchAppToDatabase', () => {
  it('matches by exact handle (case-insensitive)', () => {
    const result = matchAppToDatabase({ handle: 'klaviyo-email-marketing' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Klaviyo');
  });

  it('matches by exact name', () => {
    const result = matchAppToDatabase({ name: 'Judge.me' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.handle).toBe('judge-me');
  });

  it('matches by alias', () => {
    const result = matchAppToDatabase({ name: 'Klaviyo SMS' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.handle).toBe('klaviyo-email-marketing');
  });

  it('matches by partial alias inclusion', () => {
    const result = matchAppToDatabase({ name: 'Judgeme' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.handle).toBe('judge-me');
  });

  it('matches by fuzzy name (primary word match)', () => {
    const result = matchAppToDatabase({ name: 'Loox Product Reviews' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.handle).toBe('loox');
  });

  it('returns null when no match found', () => {
    const result = matchAppToDatabase({ name: 'Nonexistent App XYZ' }, miniDatabase);
    expect(result).toBeNull();
  });

  it('uses the real app-database.json by default', () => {
    const result = matchAppToDatabase({ handle: 'klaviyo-email-marketing' });
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Klaviyo');
  });

  it('matches handle case-insensitively', () => {
    const result = matchAppToDatabase({ handle: 'LOOX' }, miniDatabase);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Loox');
  });
});

// ---- enrichWithDatabaseInfo ----

describe('enrichWithDatabaseInfo', () => {
  it('fills in category and monthlyCost from database', () => {
    const apps: ShopifyApp[] = [
      makeFullApp({ name: 'Klaviyo', handle: 'klaviyo-email-marketing', monthlyCost: 0 }),
    ];
    const enriched = enrichWithDatabaseInfo(apps, miniDatabase);
    expect(enriched[0].category).toBe('email-marketing');
    expect(enriched[0].monthlyCost).toBe(45);
  });

  it('does not overwrite existing category or monthlyCost', () => {
    const apps: ShopifyApp[] = [
      makeFullApp({
        name: 'Klaviyo',
        handle: 'klaviyo-email-marketing',
        category: 'sms-marketing',
        monthlyCost: 99,
      }),
    ];
    const enriched = enrichWithDatabaseInfo(apps, miniDatabase);
    expect(enriched[0].category).toBe('sms-marketing'); // preserved
    expect(enriched[0].monthlyCost).toBe(99); // preserved
  });

  it('fills in handle from database when app has none', () => {
    const apps: ShopifyApp[] = [
      makeFullApp({ name: 'Judge.me', handle: '' }),
    ];
    const enriched = enrichWithDatabaseInfo(apps, miniDatabase);
    expect(enriched[0].handle).toBe('judge-me');
  });

  it('returns app unchanged when no database match found', () => {
    const apps: ShopifyApp[] = [
      makeFullApp({ name: 'Unknown App', handle: 'unknown', monthlyCost: 5 }),
    ];
    const enriched = enrichWithDatabaseInfo(apps, miniDatabase);
    expect(enriched[0]).toEqual(apps[0]);
  });

  it('works with real database by default', () => {
    const apps: ShopifyApp[] = [
      makeFullApp({ name: 'Omnisend', handle: 'omnisend', monthlyCost: 0 }),
    ];
    const enriched = enrichWithDatabaseInfo(apps);
    expect(enriched[0].category).toBe('email-marketing');
  });
});
