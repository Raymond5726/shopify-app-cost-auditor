/**
 * Shopify App Cost Auditor - MAIN world content script.
 *
 * Runs at document_start in the MAIN world so it can wrap window.fetch()
 * before Shopify's own code executes. This allows interception of GraphQL
 * responses containing app and billing data.
 */

import { installNetworkInterceptor } from '../lib/network-interceptor';

// Install the fetch interceptor immediately
installNetworkInterceptor();

console.log('[Shopify App Cost Auditor] Network interceptor is active.');
