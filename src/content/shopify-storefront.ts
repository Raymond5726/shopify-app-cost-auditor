/**
 * Shopify App Cost Auditor - Storefront performance measurement script.
 *
 * Runs on the public storefront to measure the performance impact of
 * installed Shopify apps by analyzing loaded scripts and attributing
 * them to known apps via domain signatures.
 */

import { measurePerformance } from '../lib/performance';
import type { ExtensionMessage, PerformancePayload, ScriptSignature, AppPerformanceEntry } from '../types';
import scriptSignatures from '../data/script-signatures.json';

// ============ State ============

/** Ensures we only run once per page load */
let hasRun = false;

// ============ Entry point ============

/**
 * Waits for the page to fully load before measuring performance.
 * Uses requestIdleCallback if available, otherwise falls back to the load event.
 */
function waitForPageLoad(): void {
  if (hasRun) return;

  if (document.readyState === 'complete') {
    schedulePerformanceMeasurement();
  } else {
    window.addEventListener('load', () => {
      schedulePerformanceMeasurement();
    }, { once: true });
  }
}

/**
 * Schedules the performance measurement to run during idle time,
 * giving scripts a chance to finish executing after the load event.
 */
function schedulePerformanceMeasurement(): void {
  if (hasRun) return;

  if ('requestIdleCallback' in window) {
    (window as Window).requestIdleCallback(() => {
      runPerformanceMeasurement();
    }, { timeout: 5000 });
  } else {
    // Fallback: wait a short delay after load
    setTimeout(() => {
      runPerformanceMeasurement();
    }, 2000);
  }
}

/**
 * Runs the performance measurement and sends results to the background.
 */
function runPerformanceMeasurement(): void {
  if (hasRun) return;
  hasRun = true;

  try {
    const signatures = scriptSignatures as ScriptSignature[];

    // Measure performance using Resource Timing API
    const performanceEntries = measurePerformance(signatures);

    // Also detect apps from HTML comment markers
    const commentApps = detectAppsFromHtmlComments();

    // Merge comment-detected apps that aren't already in performance entries
    const mergedEntries = mergeCommentApps(performanceEntries, commentApps);

    if (mergedEntries.length === 0) return;

    // Send performance data to background
    const payload: PerformancePayload = {
      entries: mergedEntries,
      url: window.location.href,
    };

    const message: ExtensionMessage<PerformancePayload> = {
      type: 'PERFORMANCE_DATA',
      payload,
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage(message).catch(() => {
      // Extension context may be invalid; fail silently
    });
  } catch {
    // Never break the storefront page
  }
}

// ============ HTML Comment Detection ============

/**
 * Parses HTML comments to detect Shopify app blocks.
 * Shopify uses the pattern: <!-- BEGIN app block: shopify://apps/{APP_NAME} -->
 */
function detectAppsFromHtmlComments(): DetectedCommentApp[] {
  const detected: DetectedCommentApp[] = [];
  const html = document.documentElement.innerHTML;

  // Match Shopify app block comment patterns
  const pattern = /<!--\s*BEGIN\s+app\s+block:\s*shopify:\/\/apps\/([^\s/]+)\s*-->/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const appHandle = match[1];
    // Avoid duplicates
    if (!detected.some((d) => d.handle === appHandle)) {
      detected.push({
        handle: appHandle,
        name: handleToName(appHandle),
      });
    }
  }

  return detected;
}

interface DetectedCommentApp {
  handle: string;
  name: string;
}

/**
 * Converts an app handle to a display name.
 * e.g., "klaviyo-email-marketing" -> "Klaviyo Email Marketing"
 */
function handleToName(handle: string): string {
  // Check if we know this app from signatures
  const signatures = scriptSignatures as ScriptSignature[];
  const knownApp = signatures.find((s) => s.appHandle === handle);
  if (knownApp) return knownApp.appName;

  // Fallback: capitalize each word
  return handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Merges apps detected from HTML comments into the performance entries.
 * If an app from comments is already in performance data, skip it.
 * Otherwise, add it with zero performance impact (it was detected but not measured).
 */
function mergeCommentApps(
  performanceEntries: AppPerformanceEntry[],
  commentApps: DetectedCommentApp[]
): AppPerformanceEntry[] {
  const merged = [...performanceEntries];

  for (const commentApp of commentApps) {
    const alreadyTracked = merged.some(
      (entry) =>
        entry.appName.toLowerCase() === commentApp.name.toLowerCase() ||
        entry.appName.toLowerCase().includes(commentApp.handle)
    );

    if (!alreadyTracked) {
      // Add with minimal entry - detected via comment but no script performance data
      merged.push({
        appName: commentApp.name,
        scripts: [],
        totalSize: 0,
        totalLoadTime: 0,
        renderBlocking: false,
        grade: 'A', // No scripts means no performance penalty
      });
    }
  }

  return merged;
}

// ============ Start ============

waitForPageLoad();
