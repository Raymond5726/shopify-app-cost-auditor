import React from 'react';

export function UpgradePrompt() {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Pro Features</h3>
        <span className="text-[10px] font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
          Coming Soon
        </span>
      </div>
      <p className="text-xs text-white/80 mt-1">
        Automated scheduled scans, detailed analytics, and more — coming in a future update.
      </p>
    </div>
  );
}
