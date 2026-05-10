import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ScanSnapshot } from '../../types';

interface SpendingChartProps {
  history: ScanSnapshot[];
}

export function SpendingChart({ history }: SpendingChartProps) {
  const chartData = history.map((snapshot) => ({
    date: new Date(snapshot.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    cost: snapshot.totalMonthlyCost,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-shopify-text">
          Spending Over Time
        </h2>
        <span className="flex items-center gap-1 text-[10px] font-medium text-shopify-text-secondary bg-gray-100 px-2 py-0.5 rounded-full">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          PRO
        </span>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6d7175' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6d7175' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Monthly Cost']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#008060"
              strokeWidth={2}
              dot={{ fill: '#008060', r: 3 }}
              activeDot={{ r: 5, fill: '#004c3f' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
