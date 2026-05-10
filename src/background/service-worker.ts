import type {
  ExtensionMessage,
  ShopifyApp,
  BillingEntry,
  AppPerformanceEntry,
  RedundancyGroup,
  ScanSnapshot,
  AppsDetectedPayload,
  BillingDetectedPayload,
  PerformancePayload,
} from '../types';

import { getStorageData, setStorageData, saveApps, addScanSnapshot } from '../lib/storage';
import { sendToTab, createMessage, onMessage } from '../lib/messaging';
import { mergeDetectedApps, enrichWithDatabaseInfo } from '../lib/detector';
import { detectRedundancies, calculateTotalMonthlyCost } from '../lib/categorizer';
import { initLicensing, onPaidListener } from '../lib/licensing';

// ============ In-Memory Temporary State ============

interface ScanState {
  networkApps: Partial<ShopifyApp>[];
  domApps: Partial<ShopifyApp>[];
  billingEntries: BillingEntry[];
  performanceEntries: AppPerformanceEntry[];
  isScanning: boolean;
}

let scanState: ScanState = createFreshScanState();

function createFreshScanState(): ScanState {
  return {
    networkApps: [],
    domApps: [],
    billingEntries: [],
    performanceEntries: [],
    isScanning: false,
  };
}

// ============ Badge Management ============

const BADGE_COLORS = {
  red: '#E53E3E',
  green: '#38A169',
  blue: '#3182CE',
} as const;

async function setBadgeScanning(): Promise<void> {
  await chrome.action.setBadgeText({ text: '...' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.blue });
}

async function setBadgeClean(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.green });
}

async function setBadgeRedundancies(count: number): Promise<void> {
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.red });
  } else {
    await setBadgeClean();
  }
}

// ============ Data Processing Pipeline ============

async function processScanData(): Promise<void> {
  // Step 1: Merge network and DOM detected apps
  const mergedApps = mergeDetectedApps(scanState.networkApps, scanState.domApps);

  // Step 2: Enrich with database info (categories, typical prices)
  const enrichedApps = enrichWithDatabaseInfo(mergedApps);

  // Step 3: Match billing entries to apps by name to update monthlyCost
  const appsWithBilling = matchBillingToApps(enrichedApps, scanState.billingEntries);

  // Step 4: Detect redundancy groups
  const redundancies = detectRedundancies(appsWithBilling);

  // Step 5: Save everything to storage
  const totalMonthlyCost = calculateTotalMonthlyCost(appsWithBilling);
  const now = new Date().toISOString();

  await saveApps(appsWithBilling);
  await setStorageData({ lastScanDate: now });

  // Step 6: Add scan snapshot to history
  const snapshot: ScanSnapshot = {
    date: now,
    totalMonthlyCost,
    appCount: appsWithBilling.length,
    redundancyCount: redundancies.length,
  };
  await addScanSnapshot(snapshot);

  // Step 7: Store redundancies and performance in local storage for popup retrieval
  await chrome.storage.local.set({
    redundancies,
    performanceEntries: scanState.performanceEntries,
  });

  // Step 8: Update badge
  await setBadgeRedundancies(redundancies.length);

  // Reset scan state
  scanState = createFreshScanState();
}

/**
 * Matches billing entries to apps by fuzzy name comparison.
 * Updates the monthlyCost field when a match is found.
 */
function matchBillingToApps(apps: ShopifyApp[], billingEntries: BillingEntry[]): ShopifyApp[] {
  if (billingEntries.length === 0) return apps;

  return apps.map((app) => {
    const matchedBilling = billingEntries.find((entry) => {
      const appName = app.name.toLowerCase().trim();
      const billingName = entry.appName.toLowerCase().trim();
      return (
        appName === billingName ||
        appName.includes(billingName) ||
        billingName.includes(appName)
      );
    });

    if (matchedBilling) {
      return {
        ...app,
        monthlyCost: matchedBilling.amount,
        billingCycle: matchedBilling.cycle || app.billingCycle,
      };
    }

    return app;
  });
}

// ============ Active Shopify Tab Detection ============

async function findShopifyAdminTab(): Promise<number | null> {
  const tabs = await chrome.tabs.query({
    url: ['*://*.myshopify.com/admin/*', '*://admin.shopify.com/store/*'],
  });

  if (tabs.length > 0 && tabs[0].id) {
    return tabs[0].id;
  }

  return null;
}

// ============ Message Handling ============

onMessage((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  // Return true to indicate async response
  return true;
});

async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): Promise<void> {
  switch (message.type) {
    case 'NETWORK_DATA': {
      const payload = message.payload as AppsDetectedPayload;
      scanState.networkApps = [
        ...scanState.networkApps,
        ...payload.apps,
      ];
      sendResponse({ success: true });
      break;
    }

    case 'DOM_DATA': {
      const payload = message.payload as AppsDetectedPayload;
      scanState.domApps = [
        ...scanState.domApps,
        ...payload.apps,
      ];
      sendResponse({ success: true });
      break;
    }

    case 'BILLING_DETECTED': {
      const payload = message.payload as BillingDetectedPayload;
      scanState.billingEntries = [
        ...scanState.billingEntries,
        ...payload.entries,
      ];
      sendResponse({ success: true });
      break;
    }

    case 'PERFORMANCE_DATA': {
      const payload = message.payload as PerformancePayload;
      scanState.performanceEntries = [
        ...scanState.performanceEntries,
        ...payload.entries,
      ];
      sendResponse({ success: true });
      break;
    }

    case 'GET_SCAN_DATA': {
      const storageData = await getStorageData();
      const localData = await chrome.storage.local.get(['redundancies', 'performanceEntries']);
      sendResponse({
        apps: storageData.apps,
        redundancies: (localData.redundancies as RedundancyGroup[]) || [],
        performanceEntries: (localData.performanceEntries as AppPerformanceEntry[]) || [],
        scanHistory: storageData.scanHistory,
        lastScanDate: storageData.lastScanDate,
        isScanning: scanState.isScanning,
      });
      break;
    }

    case 'TRIGGER_SCAN': {
      const tabId = await findShopifyAdminTab();
      if (tabId) {
        scanState = createFreshScanState();
        scanState.isScanning = true;
        await setBadgeScanning();
        const triggerMessage = createMessage('TRIGGER_SCAN', {});
        await sendToTab(tabId, triggerMessage);
        sendResponse({ success: true, tabId });
      } else {
        sendResponse({ success: false, error: 'No active Shopify admin tab found' });
      }
      break;
    }

    case 'SCAN_STARTED': {
      scanState.isScanning = true;
      await setBadgeScanning();
      sendResponse({ success: true });
      break;
    }

    case 'SCAN_COMPLETE': {
      scanState.isScanning = false;
      await processScanData();
      sendResponse({ success: true });
      break;
    }

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }
}

// ============ Alarm Scheduling (Pro Feature) ============

const SCAN_ALARM_NAME = 'auto-scan-alarm';

async function setupAutoScanAlarm(): Promise<void> {
  const { isPro, settings } = await getStorageData();

  // Auto-scan is a Pro feature
  if (!isPro || !settings.autoScan) {
    await chrome.alarms.clear(SCAN_ALARM_NAME);
    return;
  }

  const periodInMinutes = getAlarmPeriod(settings.scanFrequency);

  await chrome.alarms.create(SCAN_ALARM_NAME, {
    periodInMinutes,
    delayInMinutes: periodInMinutes,
  });
}

function getAlarmPeriod(frequency: 'daily' | 'weekly' | 'monthly'): number {
  switch (frequency) {
    case 'daily':
      return 24 * 60; // 1440 minutes
    case 'weekly':
      return 7 * 24 * 60; // 10080 minutes
    case 'monthly':
      return 30 * 24 * 60; // 43200 minutes
    default:
      return 7 * 24 * 60;
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SCAN_ALARM_NAME) return;

  // Verify Pro status is still active before running
  const { isPro, settings } = await getStorageData();
  if (!isPro || !settings.autoScan) {
    await chrome.alarms.clear(SCAN_ALARM_NAME);
    return;
  }

  // Find an active Shopify admin tab and trigger scan
  const tabId = await findShopifyAdminTab();
  if (tabId) {
    scanState = createFreshScanState();
    scanState.isScanning = true;
    await setBadgeScanning();
    const triggerMessage = createMessage('TRIGGER_SCAN', {});
    await sendToTab(tabId, triggerMessage);
  }
});

// Re-setup alarm whenever storage changes (e.g., user toggles setting)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.settings || changes.isPro) {
    setupAutoScanAlarm();
  }
});

// ============ Installation & Startup ============

chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize storage with defaults on first install
  if (details.reason === 'install') {
    await setStorageData({
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
    });

    const manifest = chrome.runtime.getManifest();
    console.log(`[Shopify App Cost Auditor] Installed v${manifest.version}`);
  }

  if (details.reason === 'update') {
    const manifest = chrome.runtime.getManifest();
    console.log(`[Shopify App Cost Auditor] Updated to v${manifest.version}`);
  }

  // Initialize licensing (ExtensionPay)
  await initLicensing();
  onPaidListener();

  // Set up alarm scheduling on install/update
  await setupAutoScanAlarm();
  await setBadgeClean();
});

// Also re-initialize alarm and licensing on service worker startup (in case it was terminated)
chrome.runtime.onStartup.addListener(async () => {
  await initLicensing();
  onPaidListener();
  await setupAutoScanAlarm();

  // Restore badge state from last known data
  const localData = await chrome.storage.local.get('redundancies');
  const redundancies = (localData.redundancies as RedundancyGroup[]) || [];
  await setBadgeRedundancies(redundancies.length);
});
