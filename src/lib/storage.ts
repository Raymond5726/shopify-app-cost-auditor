import type { StorageData, ShopifyApp, ScanSnapshot } from '../types';

const DEFAULT_STORAGE_DATA: StorageData = {
  apps: [],
  lastScanDate: null,
  scanHistory: [],
  storeUrl: null,
  isPro: false,
  settings: {
    autoScan: false,
    scanFrequency: 'weekly',
    notifications: true,
  },
};

/**
 * Gets all stored data, filling in defaults for any missing keys.
 */
export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(DEFAULT_STORAGE_DATA);
  return result as StorageData;
}

/**
 * Merges partial data into storage, preserving existing values for keys not provided.
 */
export async function setStorageData(data: Partial<StorageData>): Promise<void> {
  await chrome.storage.local.set(data);
}

/**
 * Convenience getter for the apps list.
 */
export async function getApps(): Promise<ShopifyApp[]> {
  const { apps } = await getStorageData();
  return apps;
}

/**
 * Saves the app list to storage.
 */
export async function saveApps(apps: ShopifyApp[]): Promise<void> {
  await setStorageData({ apps });
}

/**
 * Appends a scan snapshot to the history array.
 */
export async function addScanSnapshot(snapshot: ScanSnapshot): Promise<void> {
  const { scanHistory } = await getStorageData();
  scanHistory.push(snapshot);
  await setStorageData({ scanHistory });
}

/**
 * Resets all storage data back to defaults.
 */
export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
  await chrome.storage.local.set(DEFAULT_STORAGE_DATA);
}
