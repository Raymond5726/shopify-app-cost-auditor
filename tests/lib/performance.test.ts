import { describe, it, expect } from 'vitest';
import { calculateGrade, detectRenderBlocking } from '../../src/lib/performance';
import type { AppPerformanceEntry } from '../../src/types';

// ---- Factory helpers ----

function makeEntry(overrides: Partial<AppPerformanceEntry> = {}): AppPerformanceEntry {
  return {
    appName: overrides.appName ?? 'Test App',
    scripts: overrides.scripts ?? [],
    totalSize: overrides.totalSize ?? 0,
    totalLoadTime: overrides.totalLoadTime ?? 0,
    renderBlocking: overrides.renderBlocking ?? false,
    grade: overrides.grade ?? 'A',
  };
}

function makeResourceTiming(overrides: Partial<PerformanceResourceTiming> = {}): PerformanceResourceTiming {
  return {
    startTime: overrides.startTime ?? 0,
    responseEnd: overrides.responseEnd ?? 0,
    fetchStart: overrides.fetchStart ?? 0,
    // Required PerformanceEntry fields
    name: overrides.name ?? 'https://example.com/script.js',
    entryType: 'resource',
    duration: (overrides.responseEnd ?? 0) - (overrides.startTime ?? 0),
    toJSON: () => ({}),
    // PerformanceResourceTiming required fields
    initiatorType: 'script',
    nextHopProtocol: 'h2',
    workerStart: 0,
    redirectStart: 0,
    redirectEnd: 0,
    connectStart: 0,
    connectEnd: 0,
    secureConnectionStart: 0,
    requestStart: 0,
    responseStart: 0,
    transferSize: 0,
    encodedBodySize: 0,
    decodedBodySize: 0,
    domainLookupStart: 0,
    domainLookupEnd: 0,
    serverTiming: [],
    renderBlockingStatus: 'non-blocking',
    contentType: '',
    responseStatus: 200,
    deliveryType: '',
    firstInterimResponseStart: 0,
  } as PerformanceResourceTiming;
}

// ---- calculateGrade ----

describe('calculateGrade', () => {
  it('returns "A" for small and fast (<50KB, <200ms)', () => {
    expect(calculateGrade(makeEntry({ totalSize: 40 * 1024, totalLoadTime: 100 }))).toBe('A');
  });

  it('returns "B" for <100KB and <500ms', () => {
    expect(calculateGrade(makeEntry({ totalSize: 80 * 1024, totalLoadTime: 400 }))).toBe('B');
  });

  it('returns "C" for <200KB and <1000ms', () => {
    expect(calculateGrade(makeEntry({ totalSize: 150 * 1024, totalLoadTime: 800 }))).toBe('C');
  });

  it('returns "D" for <500KB and <2000ms', () => {
    expect(calculateGrade(makeEntry({ totalSize: 400 * 1024, totalLoadTime: 1500 }))).toBe('D');
  });

  it('returns "F" for >=500KB', () => {
    expect(calculateGrade(makeEntry({ totalSize: 600 * 1024, totalLoadTime: 100 }))).toBe('F');
  });

  it('returns "F" for >=2000ms', () => {
    expect(calculateGrade(makeEntry({ totalSize: 10 * 1024, totalLoadTime: 3000 }))).toBe('F');
  });

  // Boundary conditions: both size AND time must meet threshold
  it('returns "B" not "A" when size is small but time is 201ms', () => {
    expect(calculateGrade(makeEntry({ totalSize: 10 * 1024, totalLoadTime: 201 }))).toBe('B');
  });

  it('returns "B" not "A" when time is fast but size is 51KB', () => {
    expect(calculateGrade(makeEntry({ totalSize: 51 * 1024, totalLoadTime: 100 }))).toBe('B');
  });

  it('returns "A" at exact boundary (49.99KB, 199ms)', () => {
    expect(calculateGrade(makeEntry({ totalSize: 49.99 * 1024, totalLoadTime: 199 }))).toBe('A');
  });

  it('returns "F" when both metrics are above D threshold', () => {
    expect(calculateGrade(makeEntry({ totalSize: 1000 * 1024, totalLoadTime: 5000 }))).toBe('F');
  });

  it('returns "A" for zero size and zero load time', () => {
    expect(calculateGrade(makeEntry({ totalSize: 0, totalLoadTime: 0 }))).toBe('A');
  });
});

// ---- detectRenderBlocking ----

describe('detectRenderBlocking', () => {
  it('detects render-blocking when script starts early, takes time, no fetch delay', () => {
    const entry = makeResourceTiming({
      startTime: 10,
      fetchStart: 10,
      responseEnd: 200,
    });
    expect(detectRenderBlocking(entry)).toBe(true);
  });

  it('returns false when script starts late (after 100ms)', () => {
    const entry = makeResourceTiming({
      startTime: 150,
      fetchStart: 150,
      responseEnd: 500,
    });
    expect(detectRenderBlocking(entry)).toBe(false);
  });

  it('returns false when script is too small (< 50ms duration)', () => {
    const entry = makeResourceTiming({
      startTime: 10,
      fetchStart: 10,
      responseEnd: 40, // only 30ms
    });
    expect(detectRenderBlocking(entry)).toBe(false);
  });
});
