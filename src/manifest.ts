import { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'Shopify App Cost Auditor',
  version: '1.0.0',
  description:
    'Scan your Shopify admin to show total app spending, flag redundant apps, and measure JavaScript performance impact.',
  permissions: ['storage', 'alarms', 'activeTab'],
  host_permissions: ['*://admin.shopify.com/*', '*://*.myshopify.com/*'],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  content_scripts: [
    {
      matches: ['*://admin.shopify.com/*'],
      js: ['src/content/shopify-admin.ts'],
      world: 'MAIN',
      run_at: 'document_start',
    },
    {
      matches: ['*://admin.shopify.com/*'],
      js: ['src/content/shopify-admin-isolated.ts'],
      css: ['src/content/styles/overlay.css'],
      world: 'ISOLATED',
      run_at: 'document_idle',
    },
    {
      matches: ['*://*.myshopify.com/*'],
      js: ['src/content/shopify-storefront.ts'],
      world: 'ISOLATED',
      run_at: 'document_idle',
    },
  ],
};

export default manifest;
