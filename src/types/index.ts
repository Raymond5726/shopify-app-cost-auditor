// ============ App & Billing Types ============

export interface ShopifyApp {
  id: string;
  name: string;
  handle: string;
  icon?: string;
  category?: AppCategory;
  monthlyCost: number;
  billingCycle?: 'monthly' | 'annual' | 'one-time' | 'free';
  installedAt?: string;
  detectedVia: 'network' | 'dom' | 'both';
  isActive: boolean;
}

export type AppCategory =
  | 'email-marketing'
  | 'sms-marketing'
  | 'reviews'
  | 'seo'
  | 'page-builder'
  | 'chat'
  | 'shipping'
  | 'inventory'
  | 'analytics'
  | 'loyalty'
  | 'upsell'
  | 'social-media'
  | 'subscription'
  | 'returns'
  | 'translation'
  | 'popup'
  | 'other';

export interface AppDatabaseEntry {
  handle: string;
  name: string;
  category: AppCategory;
  typicalMonthlyPrice: number;
  aliases?: string[];
  cdnDomains?: string[];
}

export interface BillingEntry {
  appName: string;
  amount: number;
  currency: string;
  billingDate?: string;
  cycle?: 'monthly' | 'annual' | 'one-time';
}

// ============ Redundancy Types ============

export interface RedundancyGroup {
  category: AppCategory;
  categoryLabel: string;
  apps: ShopifyApp[];
  potentialSavings: number;
  recommendation: string;
}

// ============ Performance Types ============

export interface AppPerformanceEntry {
  appName: string;
  scripts: ScriptEntry[];
  totalSize: number;
  totalLoadTime: number;
  renderBlocking: boolean;
  grade: PerformanceGrade;
}

export interface ScriptEntry {
  url: string;
  size: number;
  loadTime: number;
  renderBlocking: boolean;
  transferSize?: number;
}

export type PerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// ============ Storage Types ============

export interface StorageData {
  apps: ShopifyApp[];
  lastScanDate: string | null;
  scanHistory: ScanSnapshot[];
  storeUrl: string | null;
  isPro: boolean;
  settings: UserSettings;
}

export interface ScanSnapshot {
  date: string;
  totalMonthlyCost: number;
  appCount: number;
  redundancyCount: number;
}

export interface UserSettings {
  autoScan: boolean;
  scanFrequency: 'daily' | 'weekly' | 'monthly';
  notifications: boolean;
}

// ============ Messaging Types ============

export type MessageType =
  | 'SCAN_STARTED'
  | 'SCAN_COMPLETE'
  | 'APPS_DETECTED'
  | 'BILLING_DETECTED'
  | 'PERFORMANCE_DATA'
  | 'GET_SCAN_DATA'
  | 'TRIGGER_SCAN'
  | 'NETWORK_DATA'
  | 'DOM_DATA';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

export interface AppsDetectedPayload {
  apps: Partial<ShopifyApp>[];
  source: 'network' | 'dom';
}

export interface BillingDetectedPayload {
  entries: BillingEntry[];
  source: 'network' | 'dom';
}

export interface PerformancePayload {
  entries: AppPerformanceEntry[];
  url: string;
}

// ============ Script Signature Types ============

export interface ScriptSignature {
  domain: string;
  appName: string;
  appHandle: string;
}

// ============ Selector Types ============

export interface SelectorConfig {
  appListPage: {
    appCard: string;
    appName: string;
    appIcon: string;
    appStatus: string;
  };
  billingPage: {
    subscriptionRow: string;
    appName: string;
    amount: string;
    billingCycle: string;
  };
  planPage: {
    appCharge: string;
    appName: string;
    amount: string;
  };
}

// ============ Licensing Types ============

export interface LicenseStatus {
  active: boolean;
  plan: 'free' | 'pro-monthly' | 'pro-annual' | 'lifetime';
  expiresAt?: string;
}
