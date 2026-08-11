"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="count" name="Số lượng" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Bar key={`bar-${index}`} dataKey="count" fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
