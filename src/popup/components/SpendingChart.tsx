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
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-shopify-text">
          Spending Over Time
        </h2>
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
