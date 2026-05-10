/**
 * Shopify App Cost Auditor - ISOLATED world content script.
 *
 * Bridges between the MAIN world (network interceptor) and the background
 * service worker. Also runs the DOM scraper to detect apps from page content.
 */

import { initDomScraper, scrapeAppsPage, scrapeBillingPage } from '../lib/dom-scraper';
import type { ExtensionMessage, AppsDetectedPayload, BillingDetectedPayload } from '../types';

// ============ Constants ============

const POST_MESSAGE_TYPE = 'SHOPIFY_AUDITOR_DATA';

// ============ MAIN world -> Background bridge ============

/**
 * Listens for postMessage events sent from the MAIN world network interceptor.
 * Forwards intercepted network data to the background service worker.
 */
window.addEventListener('message', (event: MessageEvent) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.type !== POST_MESSAGE_TYPE) return;

  // Forward network data to the background service worker
  try {
    const message: ExtensionMessage = {
      type: 'NETWORK_DATA',
      payload: {
        subtype: data.subtype,
        data: data.payload,
        url: data.url,
      },
      timestamp: data.timestamp || Date.now(),
    };

    chrome.runtime.sendMessage(message);
  } catch {
    // Extension context invalidated (e.g., extension was reloaded); fail silently
  }
});

// ============ Background -> Content script messaging ============

/**
 * Listens for messages from the background service worker.
 * Responds to TRIGGER_SCAN by running the DOM scraper.
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'TRIGGER_SCAN') {
      handleTriggerScan();
      sendResponse({ received: true });
    }
    // Return false for synchronous handling
    return false;
  }
);

/**
 * Handles a scan trigger from the background by re-running the DOM scraper
 * and sending any detected apps/billing data back.
 */
function handleTriggerScan(): void {
  try {
    const path = window.location.pathname;

    if (path.includes('/admin/apps') && !path.includes('/admin/apps/')) {
      const apps = scrapeAppsPage();
      if (apps.length > 0) {
        sendDomData('APPS_DETECTED', apps);
      }
    }

    if (path.includes('/admin/settings/billing') || path.includes('/admin/charges')) {
      const billing = scrapeBillingPage();
      if (billing.length > 0) {
        sendDomData('BILLING_DETECTED', billing);
      }
    }
  } catch {
    // Scraping failed; fail silently
  }
}

/**
 * Sends DOM-scraped data to the background service worker.
 */
function sendDomData(subtype: string, data: Partial<AppsDetectedPayload | BillingDetectedPayload> | unknown): void {
  try {
    const message: ExtensionMessage = {
      type: 'DOM_DATA',
      payload: {
        subtype,
        data,
        url: window.location.href,
      },
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage(message);
  } catch {
    // Extension context invalidated; fail silently
  }
}

// ============ Initialize DOM scraper ============

/**
 * Wait for the DOM to be ready before initializing the scraper.
 * The scraper needs document.body to exist for MutationObserver.
 */
function initialize(): void {
  if (document.body) {
    initDomScraper();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      initDomScraper();
    });
  }
}

initialize();
