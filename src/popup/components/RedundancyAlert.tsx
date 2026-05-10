import React, { useState } from 'react';
import type { RedundancyGroup } from '../../types';

interface RedundancyAlertProps {
  redundancies: RedundancyGroup[];
}

export function RedundancyAlert({ redundancies }: RedundancyAlertProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const totalSavings = redundancies.reduce(
    (sum, group) => sum + group.potentialSavings,
    0
  );

  function toggleGroup(index: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="bg-amber-50 border border-shopify-warning rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {redundancies.length} redundant app{' '}
            {redundancies.length === 1 ? 'group' : 'groups'} detected
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Potential savings:{' '}
            <span className="font-bold">
              ${totalSavings.toFixed(2)}/mo
            </span>
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {redundancies.map((group, index) => (
          <div
            key={index}
            className="bg-white/70 rounded-md border border-amber-200 overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(index)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                  {group.categoryLabel}
                </span>
                <span className="text-xs text-amber-700">
                  {group.apps.length} apps
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-amber-600 transition-transform ${
                  expandedGroups.has(index) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expandedGroups.has(index) && (
              <div className="px-3 pb-2 border-t border-amber-100">
                <ul className="mt-2 space-y-1">
                  {group.apps.map((app) => (
                    <li
                      key={app.id}
                      className="text-xs text-amber-900 flex justify-between"
                    >
                      <span>{app.name}</span>
                      <span className="font-medium">
                        ${app.monthlyCost}/mo
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-700 mt-2 italic">
                  {group.recommendation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
