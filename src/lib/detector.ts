import type { ShopifyApp, AppDatabaseEntry } from '../types';
import appDatabase from '../data/app-database.json';

/**
 * Normalizes a string for fuzzy comparison: lowercase, trim, remove punctuation.
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/**
 * Checks if two app names are a fuzzy match.
 * Returns true if one name contains the other, or if they share significant overlap.
 */
function fuzzyNameMatch(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Check if the primary word (first word) matches
  const primaryA = normA.split(/\s+/)[0];
  const primaryB = normB.split(/\s+/)[0];
  if (primaryA.length > 2 && primaryA === primaryB) return true;

  return false;
}

/**
 * Merges app data from network interception and DOM scraping.
 * Network data takes priority for structured fields.
 * DOM data supplements with icon URLs and visual confirmation.
 */
export function mergeDetectedApps(
  networkApps: Partial<ShopifyApp>[],
  domApps: Partial<ShopifyApp>[]
): ShopifyApp[] {
  const mergedMap = new Map<string, Partial<ShopifyApp>>();

  // First pass: index network apps by handle or normalized name
  for (const app of networkApps) {
    const key = app.handle || normalize(app.name || '');
    if (key) {
      mergedMap.set(key, { ...app, detectedVia: 'network' });
    }
  }

  // Second pass: merge DOM apps
  for (const domApp of domApps) {
    const domKey = domApp.handle || normalize(domApp.name || '');
    if (!domKey) continue;

    let matched = false;

    // Try to match by handle first
    if (domApp.handle && mergedMap.has(domApp.handle)) {
      const existing = mergedMap.get(domApp.handle)!;
      mergedMap.set(domApp.handle, {
        ...domApp,
        ...existing, // Network data takes priority
        icon: existing.icon || domApp.icon, // DOM supplements icon
        detectedVia: 'both',
      });
      matched = true;
    }

    // Try fuzzy name match if handle didn't match
    if (!matched) {
      for (const [key, existing] of mergedMap.entries()) {
        if (
          (domApp.name && existing.name && fuzzyNameMatch(domApp.name, existing.name)) ||
          (domApp.handle && existing.handle && domApp.handle === existing.handle)
        ) {
          mergedMap.set(key, {
            ...domApp,
            ...existing,
            icon: existing.icon || domApp.icon,
            detectedVia: 'both',
          });
          matched = true;
          break;
        }
      }
    }

    // No match found: add as DOM-only detection
    if (!matched) {
      mergedMap.set(domKey, { ...domApp, detectedVia: 'dom' });
    }
  }

  // Convert to full ShopifyApp objects with required defaults
  return Array.from(mergedMap.values()).map((app) => ({
    id: app.id || app.handle || `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: app.name || 'Unknown App',
    handle: app.handle || '',
    icon: app.icon,
    category: app.category,
    monthlyCost: app.monthlyCost ?? 0,
    billingCycle: app.billingCycle,
    installedAt: app.installedAt,
    detectedVia: app.detectedVia || 'dom',
    isActive: app.isActive ?? true,
  }));
}

/**
 * Attempts to match a detected app against the known app database.
 * Matches by handle, name, or aliases (case-insensitive).
 */
export function matchAppToDatabase(
  app: Partial<ShopifyApp>,
  database: AppDatabaseEntry[] = appDatabase as AppDatabaseEntry[]
): AppDatabaseEntry | null {
  for (const entry of database) {
    // Match by handle
    if (app.handle && app.handle.toLowerCase() === entry.handle.toLowerCase()) {
      return entry;
    }

    // Match by name
    if (app.name) {
      const normalizedAppName = normalize(app.name);
      const normalizedEntryName = normalize(entry.name);

      if (normalizedAppName === normalizedEntryName) {
        return entry;
      }

      // Check aliases
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          if (normalize(alias) === normalizedAppName) {
            return entry;
          }
          // Also check if alias contains the app name or vice versa
          if (
            normalize(alias).includes(normalizedAppName) ||
            normalizedAppName.includes(normalize(alias))
          ) {
            return entry;
          }
        }
      }

      // Fuzzy match against entry name
      if (fuzzyNameMatch(app.name, entry.name)) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Enriches detected apps with category and pricing data from the app database.
 * Only fills in fields that are missing from the detected app data.
 */
export function enrichWithDatabaseInfo(
  apps: ShopifyApp[],
  database: AppDatabaseEntry[] = appDatabase as AppDatabaseEntry[]
): ShopifyApp[] {
  return apps.map((app) => {
    const dbEntry = matchAppToDatabase(app, database);

    if (!dbEntry) return app;

    return {
      ...app,
      category: app.category || dbEntry.category,
      monthlyCost: app.monthlyCost || dbEntry.typicalMonthlyPrice,
      handle: app.handle || dbEntry.handle,
    };
  });
}
