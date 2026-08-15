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
  const nonEmpty = data.filter(d => d.value > 0);

  if (nonEmpty.length === 0) {
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
          data={nonEmpty}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={({ percent }) =>
            percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
          }
          outerRadius={95}
          dataKey="value"
          stroke="none"
        >
          {nonEmpty.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value, name) => [String(value), String(name)]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: "12px", color: "#475569" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
