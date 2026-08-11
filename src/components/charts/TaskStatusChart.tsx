"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface TaskStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  if (data.every(d => d.value === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            percent && percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
