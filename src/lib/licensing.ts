import type { LicenseStatus } from '../types';

const DEFAULT_LICENSE: LicenseStatus = {
  active: false,
  plan: 'free',
};

const LICENSE_STORAGE_KEY = 'licenseStatus';

/**
 * Initializes the licensing system.
 * Stub implementation — ExtensionPay integration deferred until monetization launch.
 */
export async function initLicensing(): Promise<void> {
  const result = await chrome.storage.local.get(LICENSE_STORAGE_KEY);
  if (!result[LICENSE_STORAGE_KEY]) {
    await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: DEFAULT_LICENSE });
  }
}

/**
 * Returns the current license status from storage.
 */
export async function checkLicenseStatus(): Promise<LicenseStatus> {
  const result = await chrome.storage.local.get(LICENSE_STORAGE_KEY);
  return (result[LICENSE_STORAGE_KEY] as LicenseStatus) || DEFAULT_LICENSE;
}

/**
 * Convenience check: returns true if the user has an active pro license.
 */
export async function isPro(): Promise<boolean> {
  const status = await checkLicenseStatus();
  return status.active && status.plan !== 'free';
}
