import { describe, it, expect } from 'vitest';
import { resetStorage } from '../setup';
import {
  initLicensing,
  checkLicenseStatus,
  isPro,
} from '../../src/lib/licensing';

describe('initLicensing', () => {
  it('stores default license status when none exists', async () => {
    await initLicensing();
    const status = await checkLicenseStatus();
    expect(status.active).toBe(false);
    expect(status.plan).toBe('free');
  });

  it('does not overwrite existing license status', async () => {
    resetStorage({
      licenseStatus: { active: true, plan: 'pro-monthly' },
    });
    await initLicensing();
    const status = await checkLicenseStatus();
    expect(status.active).toBe(true);
    expect(status.plan).toBe('pro-monthly');
  });
});

describe('checkLicenseStatus', () => {
  it('returns default status when storage has no license', async () => {
    const status = await checkLicenseStatus();
    expect(status.active).toBe(false);
    expect(status.plan).toBe('free');
  });

  it('returns stored license status', async () => {
    resetStorage({
      licenseStatus: { active: true, plan: 'lifetime' },
    });
    const status = await checkLicenseStatus();
    expect(status.active).toBe(true);
    expect(status.plan).toBe('lifetime');
  });
});

describe('isPro', () => {
  it('returns false when license is not active', async () => {
    resetStorage({
      licenseStatus: { active: false, plan: 'free' },
    });
    expect(await isPro()).toBe(false);
  });

  it('returns false when active but plan is free', async () => {
    resetStorage({
      licenseStatus: { active: true, plan: 'free' },
    });
    expect(await isPro()).toBe(false);
  });

  it('returns true when active and plan is pro-monthly', async () => {
    resetStorage({
      licenseStatus: { active: true, plan: 'pro-monthly' },
    });
    expect(await isPro()).toBe(true);
  });
});
