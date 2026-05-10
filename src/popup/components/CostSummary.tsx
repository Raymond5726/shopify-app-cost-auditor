import React from 'react';

interface CostSummaryProps {
  totalCost: number;
  appCount: number;
  lastScanDate: string | null;
}

export function CostSummary({ totalCost, appCount, lastScanDate }: CostSummaryProps) {
  const formattedCost = totalCost.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const formattedDate = lastScanDate
    ? new Date(lastScanDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="bg-shopify-green rounded-lg p-4 text-white shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
            Monthly App Spend
          </p>
          <p className="text-3xl font-bold mt-1">{formattedCost}</p>
        </div>
        <div className="text-right">
          <p className="text-white/90 text-sm font-medium">
            {appCount} {appCount === 1 ? 'app' : 'apps'}
          </p>
        </div>
      </div>
      {formattedDate && (
        <p className="text-white/70 text-xs mt-3 border-t border-white/20 pt-2">
          Last scanned: {formattedDate}
        </p>
      )}
    </div>
  );
}
