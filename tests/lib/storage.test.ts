import { describe, it, expect } from 'vitest';
import { resetStorage, getStorageContents } from '../setup';
import {
  getStorageData,
  setStorageData,
  getApps,
  saveApps,
  addScanSnapshot,
  clearStorage,
} from '../../src/lib/storage';
import type { ShopifyApp, ScanSnapshot } from '../../src/types';

function makeApp(name: string): ShopifyApp {
  return {
    id: name.toLowerCase().replace(/\s/g, '-'),
    name,
    handle: name.toLowerCase().replace(/\s/g, '-'),
    monthlyCost: 10,
    detectedVia: 'network',
    isActive: true,
  };
}

describe('getStorageData', () => {
  it('returns defaults when storage is empty', async () => {
    const data = await getStorageData();
    expect(data.apps).toEqual([]);
    expect(data.isPro).toBe(false);
    expect(data.lastScanDate).toBeNull();
    expect(data.scanHistory).toEqual([]);
    expect(data.storeUrl).toBeNull();
    expect(data.settings.autoScan).toBe(false);
    expect(data.settings.scanFrequency).toBe('weekly');
    expect(data.settings.notifications).toBe(true);
  });

  it('returns stored values merged with defaults', async () => {
    resetStorage({ isPro: true, apps: [makeApp('TestApp')] });
    const data = await getStorageData();
    expect(data.isPro).toBe(true);
    expect(data.apps).toHaveLength(1);
    // Missing keys get defaults
    expect(data.settings.autoScan).toBe(false);
  });
});

describe('setStorageData', () => {
  it('merges partial data into storage', async () => {
    await setStorageData({ isPro: true });
    const contents = getStorageContents();
    expect(contents.isPro).toBe(true);
  });

  it('does not overwrite unrelated keys', async () => {
    resetStorage({ storeUrl: 'https://mystore.myshopify.com' });
    await setStorageData({ isPro: true });
    const contents = getStorageContents();
    expect(contents.storeUrl).toBe('https://mystore.myshopify.com');
    expect(contents.isPro).toBe(true);
  });
});

describe('getApps', () => {
  it('returns empty array by default', async () => {
    const apps = await getApps();
    expect(apps).toEqual([]);
  });

  it('returns stored apps', async () => {
    resetStorage({ apps: [makeApp('App1'), makeApp('App2')] });
    const apps = await getApps();
    expect(apps).toHaveLength(2);
    expect(apps[0].name).toBe('App1');
  });
});

describe('saveApps', () => {
  it('saves apps to storage', async () => {
    await saveApps([makeApp('Saved')]);
    const contents = getStorageContents();
    expect((contents.apps as ShopifyApp[]).length).toBe(1);
    expect((contents.apps as ShopifyApp[])[0].name).toBe('Saved');
  });
});

describe('addScanSnapshot', () => {
  it('appends snapshot to existing history', async () => {
    const existing: ScanSnapshot = { date: '2024-01-01', totalMonthlyCost: 50, appCount: 3, redundancyCount: 1 };
    resetStorage({ scanHistory: [existing] });

    const newSnapshot: ScanSnapshot = { date: '2024-02-01', totalMonthlyCost: 60, appCount: 4, redundancyCount: 2 };
    await addScanSnapshot(newSnapshot);

    const contents = getStorageContents();
    const history = contents.scanHistory as ScanSnapshot[];
    expect(history).toHaveLength(2);
    expect(history[1].totalMonthlyCost).toBe(60);
  });

  it('creates history array when starting from empty', async () => {
    resetStorage({ scanHistory: [] });
    const snapshot: ScanSnapshot = { date: '2024-01-01', totalMonthlyCost: 25, appCount: 2, redundancyCount: 0 };
    await addScanSnapshot(snapshot);

    const contents = getStorageContents();
    expect((contents.scanHistory as ScanSnapshot[])).toHaveLength(1);
  });
});

describe('clearStorage', () => {
  it('resets storage to defaults', async () => {
    resetStorage({ isPro: true, apps: [makeApp('App')], storeUrl: 'https://store.com' });
    await clearStorage();

    const contents = getStorageContents();
    expect(contents.isPro).toBe(false);
    expect((contents.apps as ShopifyApp[])).toEqual([]);
    expect(contents.storeUrl).toBeNull();
  });
});
