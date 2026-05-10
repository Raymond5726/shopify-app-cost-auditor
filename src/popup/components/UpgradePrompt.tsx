import React from 'react';
import { openPaymentPage } from '../../lib/licensing';

export function UpgradePrompt() {
  async function handleUpgrade() {
    await openPaymentPage();
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-white">Upgrade to Pro</h3>
      <p className="text-xs text-white/80 mt-1">
        Unlock automated scanning, detailed analytics, and priority support.
      </p>
      <button
        onClick={handleUpgrade}
        className="mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold bg-shopify-green hover:bg-shopify-green-dark text-white transition-colors shadow-sm"
      >
        Upgrade Now
      </button>
    </div>
  );
}
