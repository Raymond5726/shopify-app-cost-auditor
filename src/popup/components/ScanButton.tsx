import React from 'react';

interface ScanButtonProps {
  isScanning: boolean;
  onScan: () => void;
}

export function ScanButton({ isScanning, onScan }: ScanButtonProps) {
  return (
    <button
      onClick={onScan}
      disabled={isScanning}
      className={`w-full py-3 px-4 rounded-lg font-semibold text-sm text-white transition-all ${
        isScanning
          ? 'bg-shopify-green/70 cursor-not-allowed'
          : 'bg-shopify-green hover:bg-shopify-green-dark active:scale-[0.98] shadow-sm hover:shadow-md'
      }`}
    >
      {isScanning ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Scanning...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Scan My Apps
        </span>
      )}
    </button>
  );
}
