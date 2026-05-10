import React from 'react';
import type { ShopifyApp } from '../../types';

interface AppListProps {
  apps: ShopifyApp[];
}

function formatCategory(category?: string): string {
  if (!category) return 'Other';
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    'email-marketing': 'bg-blue-100 text-blue-700',
    'sms-marketing': 'bg-purple-100 text-purple-700',
    reviews: 'bg-yellow-100 text-yellow-700',
    seo: 'bg-green-100 text-green-700',
    'page-builder': 'bg-indigo-100 text-indigo-700',
    chat: 'bg-pink-100 text-pink-700',
    shipping: 'bg-orange-100 text-orange-700',
    inventory: 'bg-teal-100 text-teal-700',
    analytics: 'bg-cyan-100 text-cyan-700',
    loyalty: 'bg-rose-100 text-rose-700',
    upsell: 'bg-amber-100 text-amber-700',
    'social-media': 'bg-violet-100 text-violet-700',
    subscription: 'bg-emerald-100 text-emerald-700',
    returns: 'bg-red-100 text-red-700',
    translation: 'bg-sky-100 text-sky-700',
    popup: 'bg-fuchsia-100 text-fuchsia-700',
  };
  return colors[category || ''] || 'bg-gray-100 text-gray-700';
}

export function AppList({ apps }: AppListProps) {
  const sortedApps = [...apps].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-shopify-text">Detected Apps</h2>
      </div>
      <div className="max-h-[240px] overflow-y-auto divide-y divide-gray-100">
        {sortedApps.map((app) => (
          <div key={app.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
            {/* App Icon */}
            {app.icon ? (
              <img
                src={app.icon}
                alt={app.name}
                className="w-8 h-8 rounded-md flex-shrink-0"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.style.display = 'none';
                  const fallback = img.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-8 h-8 rounded-md bg-shopify-surface items-center justify-center flex-shrink-0"
              style={{ display: app.icon ? 'none' : 'flex' }}
            >
              <span className="text-xs font-bold text-shopify-text-secondary">
                {app.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* App Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-shopify-text truncate">
                {app.name}
              </p>
              {app.category && (
                <span
                  className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(app.category)}`}
                >
                  {formatCategory(app.category)}
                </span>
              )}
            </div>

            {/* Cost */}
            <div className="flex-shrink-0 text-right">
              {app.monthlyCost > 0 ? (
                <p className="text-sm font-semibold text-shopify-text">
                  ${app.monthlyCost}/mo
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-400">$0</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
