import type { ShopifyApp, BillingEntry } from '../types';
import type { SelectorConfig } from '../types';
import selectors from '../data/selectors.json';

const selectorConfig = selectors as unknown as SelectorConfig & { common: Record<string, string> };

/** Debounce timeout for MutationObserver */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

/** Tracks the last observed URL to detect SPA navigation */
let lastUrl = '';

/**
 * Initializes the DOM scraper with a MutationObserver.
 * Watches for DOM changes and SPA navigation, then triggers appropriate scrapers.
 */
export function initDomScraper(): void {
  // Initial scrape based on current URL
  handleUrlChange(window.location.pathname);
  lastUrl = window.location.pathname;

  // Set up MutationObserver to watch for DOM changes (SPA navigation)
  const observer = new MutationObserver(() => {
    // Debounce to avoid excessive scraping
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const currentUrl = window.location.pathname;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange(currentUrl);
      }
    }, DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Determines which scraper to run based on the current URL path.
 */
function handleUrlChange(path: string): void {
  if (path.includes('/admin/apps') && !path.includes('/admin/apps/')) {
    // On the apps listing page
    const apps = scrapeAppsPage();
    if (apps.length > 0) {
      postScrapedData('APPS_DETECTED', apps);
    }
  } else if (path.includes('/admin/settings/billing') || path.includes('/admin/charges')) {
    // On the billing page
    const billing = scrapeBillingPage();
    if (billing.length > 0) {
      postScrapedData('BILLING_DETECTED', billing);
    }
  }
}

/**
 * Posts scraped data to the extension via chrome.runtime.sendMessage.
 */
function postScrapedData(subtype: string, payload: unknown): void {
  try {
    chrome.runtime.sendMessage({
      type: 'DOM_DATA',
      payload: {
        subtype,
        data: payload,
        url: window.location.href,
      },
      timestamp: Date.now(),
    });
  } catch {
    // Extension context may not be available; fail silently
  }
}

/**
 * Scrapes the Shopify admin apps page to extract installed app information.
 * Uses configured selectors to find app cards and extract data from them.
 */
export function scrapeAppsPage(): Partial<ShopifyApp>[] {
  const apps: Partial<ShopifyApp>[] = [];

  // Find all app cards using the configured selectors
  const cardSelectors = selectorConfig.appListPage.appCard.split(', ');
  let appCards: Element[] = [];

  for (const selector of cardSelectors) {
    const found = document.querySelectorAll(selector.trim());
    if (found.length > 0) {
      appCards = Array.from(found);
      break;
    }
  }

  for (const card of appCards) {
    const app: Partial<ShopifyApp> = {};

    // Extract app name
    const nameEl = queryWithFallbacks(card, selectorConfig.appListPage.appName);
    if (nameEl) {
      app.name = nameEl.textContent?.trim() || undefined;
    }

    // Extract app icon
    const iconEl = queryWithFallbacks(card, selectorConfig.appListPage.appIcon) as HTMLImageElement | null;
    if (iconEl && iconEl.src) {
      app.icon = iconEl.src;
    } else if (iconEl && iconEl.getAttribute('src')) {
      app.icon = iconEl.getAttribute('src') || undefined;
    }

    // Extract status
    const statusEl = queryWithFallbacks(card, selectorConfig.appListPage.appStatus);
    if (statusEl) {
      const statusText = statusEl.textContent?.trim().toLowerCase() || '';
      app.isActive = statusText.includes('active') || !statusText.includes('inactive');
    } else {
      app.isActive = true;
    }

    // Try to extract handle from links
    const appLink = card.querySelector('a[href*="/admin/apps/"]') as HTMLAnchorElement | null;
    if (appLink) {
      const href = appLink.getAttribute('href') || '';
      const handleMatch = href.match(/\/admin\/apps\/([^/?#]+)/);
      if (handleMatch) {
        app.handle = handleMatch[1];
      }
    }

    // Generate ID from handle or name
    if (app.handle) {
      app.id = app.handle;
    } else if (app.name) {
      app.id = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    if (app.name) {
      app.detectedVia = 'dom';
      apps.push(app);
    }
  }

  return apps;
}

/**
 * Scrapes the Shopify admin billing page to extract subscription/billing data.
 */
export function scrapeBillingPage(): BillingEntry[] {
  const entries: BillingEntry[] = [];

  // Find subscription rows
  const rowSelectors = selectorConfig.billingPage.subscriptionRow.split(', ');
  let rows: Element[] = [];

  for (const selector of rowSelectors) {
    const found = document.querySelectorAll(selector.trim());
    if (found.length > 0) {
      rows = Array.from(found);
      break;
    }
  }

  for (const row of rows) {
    const entry: Partial<BillingEntry> = {};

    // Extract app name
    const nameEl = queryWithFallbacks(row, selectorConfig.billingPage.appName);
    if (nameEl) {
      entry.appName = nameEl.textContent?.trim();
    }

    // Extract amount
    const amountEl = queryWithFallbacks(row, selectorConfig.billingPage.amount);
    if (amountEl) {
      const amountText = amountEl.textContent?.trim() || '';
      entry.amount = parseDollarAmount(amountText);
    }

    // Extract billing cycle
    const cycleEl = queryWithFallbacks(row, selectorConfig.billingPage.billingCycle);
    if (cycleEl) {
      const cycleText = cycleEl.textContent?.trim().toLowerCase() || '';
      if (cycleText.includes('annual') || cycleText.includes('year')) {
        entry.cycle = 'annual';
      } else if (cycleText.includes('month')) {
        entry.cycle = 'monthly';
      } else if (cycleText.includes('one-time') || cycleText.includes('one time')) {
        entry.cycle = 'one-time';
      }
    }

    if (entry.appName && entry.amount !== undefined && !isNaN(entry.amount)) {
      entries.push({
        appName: entry.appName,
        amount: entry.amount,
        currency: 'USD', // Default; Shopify admin typically shows in store currency
        billingDate: undefined,
        cycle: entry.cycle,
      });
    }
  }

  // Also try the plan/charges page selectors
  const chargeSelectors = selectorConfig.planPage.appCharge.split(', ');
  let chargeRows: Element[] = [];

  for (const selector of chargeSelectors) {
    const found = document.querySelectorAll(selector.trim());
    if (found.length > 0) {
      chargeRows = Array.from(found);
      break;
    }
  }

  for (const row of chargeRows) {
    const nameEl = queryWithFallbacks(row, selectorConfig.planPage.appName);
    const amountEl = queryWithFallbacks(row, selectorConfig.planPage.amount);

    const appName = nameEl?.textContent?.trim();
    const amount = amountEl ? parseDollarAmount(amountEl.textContent?.trim() || '') : NaN;

    if (appName && !isNaN(amount)) {
      // Avoid duplicates
      const alreadyExists = entries.some(
        (e) => e.appName === appName && e.amount === amount
      );
      if (!alreadyExists) {
        entries.push({
          appName,
          amount,
          currency: 'USD',
          cycle: 'monthly',
        });
      }
    }
  }

  return entries;
}

/**
 * Parses a dollar amount string like "$12.99/month" or "$149.99 USD" into a number.
 * Returns 0 if no valid amount can be parsed.
 */
export function parseDollarAmount(text: string): number {
  if (!text) return 0;

  // Remove currency symbols and extract the numeric portion
  const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
  if (match) {
    const cleaned = match[1].replace(/,/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }

  return 0;
}

/**
 * Queries within an element using a comma-separated list of fallback selectors.
 * Returns the first match found, or null.
 */
function queryWithFallbacks(parent: Element, selectorString: string): Element | null {
  const selectors = selectorString.split(', ');
  for (const selector of selectors) {
    try {
      const el = parent.querySelector(selector.trim());
      if (el) return el;
    } catch {
      // Invalid selector, try next
    }
  }
  return null;
}
