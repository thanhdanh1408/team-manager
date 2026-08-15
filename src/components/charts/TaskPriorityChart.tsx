"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TaskPriorityChartProps {
  data: {
    name: string;
    count: number;
    color: string;
  }[];
}

export function TaskPriorityChart({ data }: TaskPriorityChartProps) {
  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value) => [String(value), "Số lượng"]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
