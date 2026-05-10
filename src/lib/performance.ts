import type {
  AppPerformanceEntry,
  ScriptEntry,
  ScriptSignature,
  PerformanceGrade,
} from '../types';

/**
 * Measures performance impact of app scripts using the Resource Timing API.
 * Filters resource entries for scripts and attributes them to apps via domain matching.
 */
export function measurePerformance(signatures: ScriptSignature[]): AppPerformanceEntry[] {
  const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  // Filter to script resources only
  const scriptEntries = resourceEntries.filter(
    (entry) => entry.initiatorType === 'script' || entry.name.endsWith('.js')
  );

  // Group scripts by app
  const appScriptsMap = new Map<string, { signature: ScriptSignature; scripts: ScriptEntry[] }>();

  for (const entry of scriptEntries) {
    const matchedSignature = matchScriptToApp(entry.name, signatures);
    if (!matchedSignature) continue;

    const key = matchedSignature.appHandle;
    if (!appScriptsMap.has(key)) {
      appScriptsMap.set(key, { signature: matchedSignature, scripts: [] });
    }

    const size = entry.transferSize || entry.encodedBodySize || 0;
    const loadTime = entry.responseEnd - entry.startTime;

    appScriptsMap.get(key)!.scripts.push({
      url: entry.name,
      size,
      loadTime: Math.max(0, loadTime),
      renderBlocking: detectRenderBlocking(entry),
      transferSize: entry.transferSize,
    });
  }

  // Build per-app performance entries
  const results: AppPerformanceEntry[] = [];

  for (const [, { signature, scripts }] of appScriptsMap) {
    const totalSize = scripts.reduce((sum, s) => sum + s.size, 0);
    const totalLoadTime = scripts.reduce((sum, s) => sum + s.loadTime, 0);
    const renderBlocking = scripts.some((s) => s.renderBlocking);

    const entry: AppPerformanceEntry = {
      appName: signature.appName,
      scripts,
      totalSize,
      totalLoadTime,
      renderBlocking,
      grade: 'A', // Placeholder, calculated below
    };

    entry.grade = calculateGrade(entry);
    results.push(entry);
  }

  // Sort by total size descending (heaviest first)
  results.sort((a, b) => b.totalSize - a.totalSize);

  return results;
}

/**
 * Matches a script URL to an app based on domain signatures.
 */
function matchScriptToApp(
  url: string,
  signatures: ScriptSignature[]
): ScriptSignature | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    for (const sig of signatures) {
      // Check if the URL's hostname matches or ends with the signature domain
      if (hostname === sig.domain || hostname.endsWith('.' + sig.domain)) {
        return sig;
      }
      // Also check if the full URL path contains the domain (for CDN paths like cdn.shopify.com/shopifycloud/shopify-chat)
      if (url.includes(sig.domain)) {
        return sig;
      }
    }
  } catch {
    // Invalid URL, skip
  }

  return null;
}

/**
 * Calculates a performance grade for an app based on total script size and load time.
 * A: <50KB total, <200ms load
 * B: <100KB, <500ms
 * C: <200KB, <1000ms
 * D: <500KB, <2000ms
 * F: anything above
 */
export function calculateGrade(entry: AppPerformanceEntry): PerformanceGrade {
  const sizeKB = entry.totalSize / 1024;
  const loadMs = entry.totalLoadTime;

  if (sizeKB < 50 && loadMs < 200) return 'A';
  if (sizeKB < 100 && loadMs < 500) return 'B';
  if (sizeKB < 200 && loadMs < 1000) return 'C';
  if (sizeKB < 500 && loadMs < 2000) return 'D';
  return 'F';
}

/**
 * Detects if a script resource was render-blocking based on timing data.
 * A resource is considered render-blocking if it started loading before
 * the first contentful paint and completed after the document's DOMContentLoaded.
 */
export function detectRenderBlocking(entry: PerformanceResourceTiming): boolean {
  // A script is likely render-blocking if:
  // 1. It was initiated early (before DOM interactive)
  // 2. It has no async/defer characteristics (short gap between fetch start and response end)
  // 3. It blocks on the main document parsing

  // Heuristic: if the script started before 100ms and took significant time,
  // or if there's no fetch delay (indicating synchronous loading)
  const startedEarly = entry.startTime < 100;
  const isLargeBlock = entry.responseEnd - entry.startTime > 50;
  const noFetchDelay = entry.fetchStart - entry.startTime < 5;

  return startedEarly && isLargeBlock && noFetchDelay;
}
