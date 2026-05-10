import type { ShopifyApp, BillingEntry } from '../types';

/** Unique message type identifier for postMessage communication */
const MESSAGE_TYPE = 'SHOPIFY_AUDITOR_DATA';

/** URL patterns that indicate Shopify admin GraphQL endpoints */
const SHOPIFY_GRAPHQL_PATTERNS = [
  '/admin/api/',
  '/admin/internal/web/graphql/',
  'graphql.json',
  '/admin/apps',
];

/**
 * Installs a network interceptor by wrapping window.fetch with a Proxy.
 * Intercepts responses from Shopify GraphQL endpoints to extract app/billing data.
 * Posts structured data via window.postMessage for the content script to pick up.
 *
 * This function is designed to run in the MAIN world context.
 */
export function installNetworkInterceptor(): void {
  const originalFetch = window.fetch;

  window.fetch = new Proxy(originalFetch, {
    apply(target, thisArg, args: [RequestInfo | URL, RequestInit?]) {
      const request = args[0];
      const url = typeof request === 'string' ? request : request instanceof URL ? request.href : (request as Request).url;

      const resultPromise = Reflect.apply(target, thisArg, args) as Promise<Response>;

      // Only intercept matching URLs
      if (isShopifyEndpoint(url)) {
        resultPromise
          .then(async (response) => {
            try {
              // Only process JSON responses
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.includes('application/json')) return;

              // Clone the response so the original is not consumed
              const clonedResponse = response.clone();
              const data = await clonedResponse.json();

              processResponseData(data, url);
            } catch {
              // Silently ignore parsing errors - never break the page
            }
          })
          .catch(() => {
            // Silently ignore fetch errors
          });
      }

      // Always return the original promise so page behavior is unchanged
      return resultPromise;
    },
  });
}

/**
 * Checks if a URL matches Shopify admin/GraphQL patterns.
 */
function isShopifyEndpoint(url: string): boolean {
  return SHOPIFY_GRAPHQL_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * Processes intercepted response data and posts results via window.postMessage.
 */
function processResponseData(data: unknown, url: string): void {
  const apps = parseAppData(data);
  if (apps && apps.length > 0) {
    window.postMessage(
      {
        type: MESSAGE_TYPE,
        subtype: 'APPS_DETECTED',
        payload: apps,
        url,
        timestamp: Date.now(),
      },
      '*'
    );
  }

  const billing = parseBillingData(data);
  if (billing && billing.length > 0) {
    window.postMessage(
      {
        type: MESSAGE_TYPE,
        subtype: 'BILLING_DETECTED',
        payload: billing,
        url,
        timestamp: Date.now(),
      },
      '*'
    );
  }
}

/**
 * Extracts app information from various Shopify GraphQL response shapes.
 * Handles multiple known response structures for app listings.
 */
export function parseAppData(data: unknown): Partial<ShopifyApp>[] | null {
  if (!data || typeof data !== 'object') return null;

  const apps: Partial<ShopifyApp>[] = [];
  const obj = data as Record<string, unknown>;

  try {
    // Shape 1: data.apps or data.data.apps (direct app listing)
    const appsData = extractNestedField(obj, ['data', 'apps', 'edges']) ||
      extractNestedField(obj, ['data', 'appInstallations', 'edges']) ||
      extractNestedField(obj, ['apps']) ||
      extractNestedField(obj, ['data', 'apps']);

    if (Array.isArray(appsData)) {
      for (const item of appsData) {
        const node = item?.node || item;
        if (!node || typeof node !== 'object') continue;

        const appNode = node as Record<string, unknown>;
        const app: Partial<ShopifyApp> = {};

        // Extract title/name
        if (typeof appNode.title === 'string') app.name = appNode.title;
        else if (typeof appNode.name === 'string') app.name = appNode.name;

        // Extract handle
        if (typeof appNode.handle === 'string') app.handle = appNode.handle;

        // Extract icon
        if (appNode.icon && typeof appNode.icon === 'object') {
          const icon = appNode.icon as Record<string, unknown>;
          if (typeof icon.url === 'string') app.icon = icon.url;
          else if (typeof icon.src === 'string') app.icon = icon.src;
        }

        // Extract pricing
        if (typeof appNode.pricingDetails === 'string') {
          const price = parsePriceString(appNode.pricingDetails);
          if (price !== null) app.monthlyCost = price;
        }

        // Extract installation status
        if (typeof appNode.installed === 'boolean') app.isActive = appNode.installed;
        if (typeof appNode.status === 'string') {
          app.isActive = appNode.status.toLowerCase() === 'active';
        }

        // Extract ID
        if (typeof appNode.id === 'string') app.id = appNode.id;

        if (app.name || app.handle) {
          apps.push(app);
        }
      }
    }

    // Shape 2: data.data.currentAppInstallation or single app response
    const currentApp = extractNestedField(obj, ['data', 'currentAppInstallation']) ||
      extractNestedField(obj, ['data', 'app']);

    if (currentApp && typeof currentApp === 'object') {
      const appNode = currentApp as Record<string, unknown>;
      const app: Partial<ShopifyApp> = {};

      if (typeof appNode.title === 'string') app.name = appNode.title;
      if (typeof appNode.name === 'string') app.name = appNode.name;
      if (typeof appNode.handle === 'string') app.handle = appNode.handle;

      if (app.name || app.handle) {
        apps.push(app);
      }
    }
  } catch {
    // Never throw to the page
    return null;
  }

  return apps.length > 0 ? apps : null;
}

/**
 * Extracts billing information from GraphQL response shapes.
 */
export function parseBillingData(data: unknown): BillingEntry[] | null {
  if (!data || typeof data !== 'object') return null;

  const entries: BillingEntry[] = [];
  const obj = data as Record<string, unknown>;

  try {
    // Shape 1: data.data.currentAppInstallation.activeSubscriptions
    const subscriptions = extractNestedField(obj, ['data', 'currentAppInstallation', 'activeSubscriptions']) ||
      extractNestedField(obj, ['data', 'appSubscriptions', 'edges']) ||
      extractNestedField(obj, ['data', 'activeSubscriptions']) ||
      extractNestedField(obj, ['data', 'recurringCharges']);

    if (Array.isArray(subscriptions)) {
      for (const item of subscriptions) {
        const node = item?.node || item;
        if (!node || typeof node !== 'object') continue;

        const subNode = node as Record<string, unknown>;
        const entry: Partial<BillingEntry> = {};

        // Extract app name
        if (typeof subNode.name === 'string') entry.appName = subNode.name;
        if (typeof subNode.appName === 'string') entry.appName = subNode.appName;

        // Extract amount
        if (subNode.price && typeof subNode.price === 'object') {
          const price = subNode.price as Record<string, unknown>;
          if (typeof price.amount === 'number') entry.amount = price.amount;
          else if (typeof price.amount === 'string') entry.amount = parseFloat(price.amount);
          if (typeof price.currencyCode === 'string') entry.currency = price.currencyCode;
        }
        if (typeof subNode.amount === 'number') entry.amount = subNode.amount;
        if (typeof subNode.amount === 'string') entry.amount = parseFloat(subNode.amount);

        // Extract currency
        if (typeof subNode.currencyCode === 'string') entry.currency = subNode.currencyCode;
        if (typeof subNode.currency === 'string') entry.currency = subNode.currency;

        // Extract billing cycle
        if (typeof subNode.interval === 'string') {
          const interval = subNode.interval.toLowerCase();
          if (interval.includes('annual') || interval.includes('year')) entry.cycle = 'annual';
          else if (interval.includes('month')) entry.cycle = 'monthly';
          else entry.cycle = 'one-time';
        }

        // Extract billing date
        if (typeof subNode.billingOn === 'string') entry.billingDate = subNode.billingOn;
        if (typeof subNode.createdAt === 'string') entry.billingDate = subNode.createdAt;

        if (entry.appName && entry.amount !== undefined) {
          entries.push({
            appName: entry.appName,
            amount: entry.amount,
            currency: entry.currency || 'USD',
            billingDate: entry.billingDate,
            cycle: entry.cycle,
          });
        }
      }
    }

    // Shape 2: billing charges array
    const charges = extractNestedField(obj, ['data', 'charges', 'edges']) ||
      extractNestedField(obj, ['data', 'appCharges']);

    if (Array.isArray(charges)) {
      for (const item of charges) {
        const node = item?.node || item;
        if (!node || typeof node !== 'object') continue;

        const chargeNode = node as Record<string, unknown>;

        const appName = (chargeNode.name || chargeNode.appName) as string | undefined;
        const amount =
          typeof chargeNode.amount === 'number'
            ? chargeNode.amount
            : typeof chargeNode.amount === 'string'
              ? parseFloat(chargeNode.amount)
              : null;

        if (appName && amount !== null) {
          entries.push({
            appName,
            amount,
            currency: (chargeNode.currencyCode as string) || 'USD',
            cycle: 'monthly',
          });
        }
      }
    }
  } catch {
    // Never throw to the page
    return null;
  }

  return entries.length > 0 ? entries : null;
}

/**
 * Safely traverses a nested object path and returns the value found.
 */
function extractNestedField(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Parses a price string like "$12.99/month" into a number.
 */
function parsePriceString(text: string): number | null {
  const match = text.match(/\$?([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}
