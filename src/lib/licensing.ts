import ExtPay from 'extpay';
import type { LicenseStatus } from '../types';

/**
 * Replace this ID after registering on extensionpay.com.
 * Must match the extension ID you register there.
 */
const EXTENSIONPAY_ID = 'shopify-app-cost-auditor';

const extpay = ExtPay(EXTENSIONPAY_ID);

const DEFAULT_LICENSE: LicenseStatus = {
  active: false,
  plan: 'free',
};

const LICENSE_STORAGE_KEY = 'licenseStatus';

/**
 * Initializes the ExtensionPay licensing system.
 * Call this inside chrome.runtime.onInstalled and chrome.runtime.onStartup.
 */
export async function initLicensing(): Promise<void> {
  try {
    extpay.startBackground();
  } catch (err) {
    console.warn('[Licensing] ExtPay startBackground failed:', err);
  }

  // Ensure default license status exists in storage
  const result = await chrome.storage.local.get(LICENSE_STORAGE_KEY);
  if (!result[LICENSE_STORAGE_KEY]) {
    await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: DEFAULT_LICENSE });
  }

  // Sync current payment status from ExtPay
  try {
    const user = await extpay.getUser();
    await syncLicenseFromUser(user);
  } catch {
    // ExtPay API not available yet (not registered) — use stored/default status
  }
}

/**
 * Registers a callback for when the user completes a payment.
 * Writes isPro: true to storage so existing onChanged listeners pick it up.
 */
export function onPaidListener(): void {
  extpay.onPaid.addListener(async (user) => {
    await syncLicenseFromUser(user);
    await chrome.storage.local.set({ isPro: true });
  });
}

/**
 * Syncs license status from an ExtPay user object to chrome storage.
 */
async function syncLicenseFromUser(user: { paid: boolean; plan?: { interval?: string } | null }): Promise<void> {
  const license: LicenseStatus = user.paid
    ? {
        active: true,
        plan: 'pro-monthly', // ExtPay doesn't expose plan name in code; dashboard configures tiers
      }
    : DEFAULT_LICENSE;

  await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: license });
}

/**
 * Returns the current license status from storage.
 * Falls back to default if ExtPay API is unavailable.
 */
export async function checkLicenseStatus(): Promise<LicenseStatus> {
  try {
    const user = await extpay.getUser();
    const license: LicenseStatus = user.paid
      ? { active: true, plan: 'pro-monthly' }
      : DEFAULT_LICENSE;
    return license;
  } catch {
    // ExtPay unavailable — fall back to cached storage value
    const result = await chrome.storage.local.get(LICENSE_STORAGE_KEY);
    return (result[LICENSE_STORAGE_KEY] as LicenseStatus) || DEFAULT_LICENSE;
  }
}

/**
 * Convenience check: returns true if the user has an active pro license.
 */
export async function isPro(): Promise<boolean> {
  const status = await checkLicenseStatus();
  return status.active && status.plan !== 'free';
}

/**
 * Opens the ExtensionPay payment page in a new tab.
 */
export async function openPaymentPage(): Promise<void> {
  try {
    await extpay.openPaymentPage();
  } catch {
    // Fallback if ExtPay is not registered yet
    chrome.tabs.create({ url: 'https://extensionpay.com' });
  }
}
