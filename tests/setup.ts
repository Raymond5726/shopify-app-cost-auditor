/**
 * Global Chrome API mock for Vitest.
 * Provides in-memory chrome.storage.local, chrome.runtime, chrome.tabs, chrome.alarms, and chrome.action.
 */

let storageData: Record<string, unknown> = {};

const chromeStorageLocal = {
  get: vi.fn(async (keys: unknown) => {
    if (typeof keys === 'string') {
      // Pattern: chrome.storage.local.get('keyName')
      return { [keys]: storageData[keys] };
    }
    if (Array.isArray(keys)) {
      // Pattern: chrome.storage.local.get(['key1', 'key2'])
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = storageData[key];
      }
      return result;
    }
    if (keys && typeof keys === 'object') {
      // Pattern: chrome.storage.local.get(defaultsObject)
      // Returns stored values merged with defaults for missing keys
      const defaults = keys as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(defaults)) {
        result[key] = key in storageData ? storageData[key] : defaults[key];
      }
      return result;
    }
    // No keys: return everything
    return { ...storageData };
  }),

  set: vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(storageData, items);
  }),

  clear: vi.fn(async () => {
    storageData = {};
  }),

  remove: vi.fn(async (keys: string | string[]) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      delete storageData[key];
    }
  }),
};

const chrome = {
  storage: {
    local: chromeStorageLocal,
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(async () => ({ success: true })),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
  tabs: {
    create: vi.fn(async () => ({ id: 1 })),
    query: vi.fn(async () => []),
  },
  alarms: {
    create: vi.fn(async () => {}),
    clear: vi.fn(async () => true),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(async () => {}),
    setBadgeBackgroundColor: vi.fn(async () => {}),
  },
};

// Assign to globalThis so modules that reference `chrome` at import time find it
Object.assign(globalThis, { chrome });

/**
 * Helper to reset the in-memory storage between tests.
 */
export function resetStorage(initial: Record<string, unknown> = {}): void {
  storageData = { ...initial };
}

/**
 * Helper to inspect the current in-memory storage contents.
 */
export function getStorageContents(): Record<string, unknown> {
  return { ...storageData };
}

// Reset mocks and storage before each test
beforeEach(() => {
  resetStorage();
  vi.clearAllMocks();
});
