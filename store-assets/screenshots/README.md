# Screenshot Requirements for Chrome Web Store

## Required Screenshots
Chrome Web Store requires 1-5 screenshots.

## Size & Format
- **Dimensions**: 1280x800 or 640x400 pixels
- **Format**: PNG or JPEG
- **Max file size**: 2MB per image

## Recommended Screenshots

1. **popup-cost-summary.png** — The popup showing the cost summary card with total monthly spend and app count.
2. **popup-redundancy-alert.png** — The popup showing a redundancy alert with multiple apps in the same category and potential savings.
3. **popup-app-list.png** — The popup showing the full app list with detected apps, their costs, and categories.
4. **popup-performance-report.png** — The popup showing performance grades (A-F) for detected apps with script sizes.
5. **popup-spending-chart.png** — The popup showing the spending history chart with multiple scan snapshots.

## How to Capture

1. Load the extension in Chrome (`chrome://extensions` > Load unpacked > select `dist/`)
2. Navigate to a Shopify admin store with apps installed
3. Run a scan to populate data
4. Open the popup and use Chrome DevTools to screenshot at the correct dimensions
   - Right-click popup > Inspect
   - In DevTools, use the device toolbar to set exact dimensions
   - Capture screenshot via DevTools (Ctrl+Shift+P > "Capture screenshot")

## Promotional Images (Optional)
- **Small tile**: 440x280 PNG
- **Marquee**: 1400x560 PNG
