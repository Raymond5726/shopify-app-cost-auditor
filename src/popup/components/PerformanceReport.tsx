import React from 'react';
import type { AppPerformanceEntry, PerformanceGrade } from '../../types';

interface PerformanceReportProps {
  entries: AppPerformanceEntry[];
}

function getGradeStyles(grade: PerformanceGrade): string {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'B':
      return 'bg-blue-100 text-blue-800';
    case 'C':
      return 'bg-yellow-100 text-yellow-800';
    case 'D':
      return 'bg-orange-100 text-orange-800';
    case 'F':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const gradeOrder: Record<PerformanceGrade, number> = {
  F: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
};

export function PerformanceReport({ entries }: PerformanceReportProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => gradeOrder[a.grade] - gradeOrder[b.grade]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-shopify-text">
          Performance Impact
        </h2>
      </div>
      <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-100">
        {sortedEntries.map((entry) => (
          <div
            key={entry.appName}
            className="px-4 py-2.5 flex items-center gap-3"
          >
            {/* Grade Badge */}
            <span
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${getGradeStyles(entry.grade)}`}
            >
              {entry.grade}
            </span>

            {/* App Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-shopify-text truncate">
                {entry.appName}
              </p>
              <p className="text-[11px] text-shopify-text-secondary">
                {formatSize(entry.totalSize)} &middot; {entry.totalLoadTime}ms
                {entry.renderBlocking && (
                  <span className="text-shopify-critical ml-1">&middot; Render-blocking</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
