import React, { useEffect, useState } from 'react';
import type {
  ShopifyApp,
  RedundancyGroup,
  AppPerformanceEntry,
  ScanSnapshot,
} from '../types';
import { CostSummary } from './components/CostSummary';
import { AppList } from './components/AppList';
import { RedundancyAlert } from './components/RedundancyAlert';
import { PerformanceReport } from './components/PerformanceReport';
import { SpendingChart } from './components/SpendingChart';
import { ScanButton } from './components/ScanButton';
import { UpgradePrompt } from './components/UpgradePrompt';

export function Popup() {
  const [apps, setApps] = useState<ShopifyApp[]>([]);
  const [redundancies, setRedundancies] = useState<RedundancyGroup[]>([]);
  const [performanceEntries, setPerformanceEntries] = useState<AppPerformanceEntry[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanSnapshot[]>([]);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await chrome.storage.local.get([
        'apps',
        'lastScanDate',
        'scanHistory',
        'isPro',
        'redundancies',
        'performanceEntries',
        'settings',
      ]);

      setApps(result.apps || []);
      setLastScanDate(result.lastScanDate || null);
      setScanHistory(result.scanHistory || []);
      setIsPro(result.isPro || false);
      setRedundancies(result.redundancies || []);
      setPerformanceEntries(result.performanceEntries || []);
      setNotifications(result.settings?.notifications ?? true);
    } catch (error) {
      console.error('Failed to load data from storage:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleScan() {
    setIsScanning(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'TRIGGER_SCAN',
        payload: {},
        timestamp: Date.now(),
      });

      // Wait briefly then reload data
      setTimeout(async () => {
        await loadData();
        setIsScanning(false);
      }, 3000);
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanning(false);
    }
  }

  async function handleClearData() {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      apps: [],
      lastScanDate: null,
      scanHistory: [],
      storeUrl: null,
      isPro: false,
      settings: { autoScan: false, scanFrequency: 'weekly', notifications: true },
    });
    await loadData();
    setShowSettings(false);
  }

  async function handleToggleNotifications() {
    const newValue = !notifications;
    setNotifications(newValue);
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { autoScan: false, scanFrequency: 'weekly', notifications: true };
    settings.notifications = newValue;
    await chrome.storage.local.set({ settings });
  }

  const totalCost = apps.reduce((sum, app) => sum + app.monthlyCost, 0);

  if (isLoading) {
    return (
      <div className="w-[400px] min-h-[500px] bg-shopify-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-shopify-green border-t-transparent rounded-full animate-spin" />
          <p className="text-shopify-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="w-[400px] min-h-[500px] bg-shopify-surface flex flex-col">
        <header className="bg-shopify-green-dark px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-semibold text-base">Settings</h1>
          </div>
        </header>

        <div className="flex-1 p-4 space-y-4">
          {/* Notifications toggle */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-shopify-text">Notifications</p>
                <p className="text-xs text-shopify-text-secondary mt-0.5">
                  Show badge alerts for redundant apps
                </p>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  notifications ? 'bg-shopify-green' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Clear data */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm font-medium text-shopify-text">Clear All Data</p>
            <p className="text-xs text-shopify-text-secondary mt-0.5">
              Remove all scan history, detected apps, and reset to defaults.
            </p>
            <button
              onClick={handleClearData}
              className="mt-3 px-4 py-2 text-xs font-medium text-shopify-critical bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Clear Data
            </button>
          </div>

          {/* About */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm font-medium text-shopify-text">About</p>
            <p className="text-xs text-shopify-text-secondary mt-1">
              Shopify App Cost Auditor v1.0.0
            </p>
            <p className="text-xs text-shopify-text-secondary mt-0.5">
              Scans your Shopify admin to reveal app costs, flag redundant apps, and grade performance impact.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] bg-shopify-surface flex flex-col">
      {/* Header */}
      <header className="bg-shopify-green-dark px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
          <h1 className="text-white font-semibold text-base">App Cost Auditor</h1>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-white/80 hover:text-white transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <CostSummary
          totalCost={totalCost}
          appCount={apps.length}
          lastScanDate={lastScanDate}
        />

        {!isPro && <UpgradePrompt />}

        {redundancies.length > 0 && (
          <RedundancyAlert redundancies={redundancies} />
        )}

        {apps.length > 0 ? (
          <AppList apps={apps} />
        ) : (
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <svg
              className="w-12 h-12 text-shopify-text-secondary mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-shopify-text font-medium mb-1">No apps detected yet</p>
            <p className="text-shopify-text-secondary text-sm">
              Navigate to your Shopify admin and click "Scan My Apps" to get started.
            </p>
          </div>
        )}

        {performanceEntries.length > 0 && (
          <PerformanceReport entries={performanceEntries} />
        )}

        {scanHistory.length > 1 && (
          <SpendingChart history={scanHistory} />
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <ScanButton isScanning={isScanning} onScan={handleScan} />
      </div>
    </div>
  );
}
