import React, { useEffect, useState } from 'react';
import type {
  ShopifyApp,
  RedundancyGroup,
  AppPerformanceEntry,
  ScanSnapshot,
  StorageData,
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
      ]);

      setApps(result.apps || []);
      setLastScanDate(result.lastScanDate || null);
      setScanHistory(result.scanHistory || []);
      setIsPro(result.isPro || false);
      setRedundancies(result.redundancies || []);
      setPerformanceEntries(result.performanceEntries || []);
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
