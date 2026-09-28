'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartSpec } from '@/types/deck';

const FALLBACK = [
  '#635BFF',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#8B5CF6',
];

export function ChartView({ spec }: { spec: ChartSpec }) {
  const colors = spec.colors?.length ? spec.colors : FALLBACK;

  const data = spec.categories.map((c, i) =>
    Object.fromEntries([
      ['name', c],
      ...spec.series.map((s) => [
        s.name,
        s.data[i] ?? 0,
      ]),
    ]),
  );

  /**
   * During browser print, ResponsiveContainer can fail to calculate
   * the parent's dimensions. The print-specific CSS gives this wrapper
   * a fixed size so Recharts can calculate its SVG dimensions.
   */
  const chart = spec.type === 'pie' ? (
    <PieChart>
      <Pie
        data={data}
        dataKey={spec.series[0]?.name || 'value'}
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius="68%"
        label
      >
        {data.map((_, i) => (
          <Cell
            key={i}
            fill={colors[i % colors.length]}
          />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  ) : (
    (() => {
      const C = spec.type === 'line'
        ? LineChart
        : BarChart;

      return (
        <C
          data={data}
          margin={{
            top: 20,
            right: 20,
            left: 0,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Legend />

          {spec.series.map((series, i) =>
            spec.type === 'line' ? (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[i % colors.length]}
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            ) : (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={colors[i % colors.length]}
                radius={[5, 5, 0, 0]}
              />
            ),
          )}
        </C>
      );
    })()
  );

  return (
    <div
      className="chart-wrapper"
      style={{
        width: '100%',
        height: '100%',
        minWidth: 1,
        minHeight: 1,
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
      >
        {chart}
      </ResponsiveContainer>
    </div>
  );
}