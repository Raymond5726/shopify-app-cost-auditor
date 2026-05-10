# Shopify App Cost Auditor — Chrome Web Store Description

## Title
Shopify App Cost Auditor

## Summary
Know exactly what your Shopify apps cost. Scan your admin to reveal total spending, flag redundant apps in the same category, and grade each app's JavaScript performance impact on your storefront.

## Description

**Stop overpaying for Shopify apps you don't need.**

Shopify App Cost Auditor scans your admin dashboard to give you a clear picture of your total app spending, highlights apps doing the same job, and measures how each app's scripts affect your store's speed.

### What It Does

**Cost Visibility**
See your total monthly app spend at a glance. The extension detects installed apps from both the Shopify admin API and the apps page, then matches them against a curated database of 50+ popular Shopify apps to fill in typical pricing.

**Redundancy Detection**
Running two SEO apps? Three email marketing tools? The auditor groups apps by category and calculates how much you could save by consolidating. Each redundancy group includes a specific recommendation with the potential monthly savings.

**Performance Grading**
Every app adds JavaScript to your storefront. The auditor measures each app's total script size and load time, then assigns a grade from A (lightweight) to F (heavy). Render-blocking scripts are flagged so you know which apps are slowing down your store the most.

**Spending History**
Track your app costs over time with automatic snapshots after each scan. A built-in chart shows your spending trend so you can see the impact of adding or removing apps.

### How It Works

1. Navigate to your Shopify admin (admin.shopify.com)
2. Click the extension icon and press "Scan My Apps"
3. Review your cost summary, redundancy alerts, and performance grades

The extension works by reading data that's already on your Shopify admin pages — it intercepts GraphQL responses and reads the DOM. All processing happens locally in your browser. No data is ever sent to external servers.

### Free vs Pro

**Free** — Full scanning, cost analysis, redundancy detection, and performance grading.

**Pro** — Everything in Free, plus automated scheduled scans (daily, weekly, or monthly) so your data stays current without manual effort.

### Privacy

All data stays on your device. The only external communication is with ExtensionPay for license management. See our full privacy policy for details.

### Supported Browsers
Chrome (Manifest V3)

### Permissions Used
- **storage** — Save scan results and settings locally
- **alarms** — Schedule automated scans (Pro)
- **activeTab** — Access the current Shopify admin tab for scanning
- **admin.shopify.com** — Read app and billing data from Shopify admin
- ***.myshopify.com** — Measure app script performance on your storefront
