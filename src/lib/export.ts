"use client";

import { pdf } from "@react-pdf/renderer";
import { TaskSummaryPDF } from "@/components/reports/TaskSummaryPDF";
import type { Task, User } from "@/types";

interface ExportPDFOptions {
  tasks: Task[];
  getUser: (id: string) => User | undefined;
  period?: {
    from?: string;
    to?: string;
  };
  filename?: string;
}

export async function exportTasksPDF(options: ExportPDFOptions) {
  const { tasks, getUser, period = {}, filename } = options;
  
  const blob = await pdf(
    TaskSummaryPDF({ tasks, getUser, period })
  ).toBlob();
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `tasks-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTasksCSV(tasks: Task[], getUser: (id: string) => User | undefined) {
  const headers = [
    "ID",
    "Tiêu đề",
    "Mô tả",
    "Người nhận",
    "Email",
    "Ưu tiên",
    "Trạng thái",
    "Hạn chót",
    "Hoàn thành",
    "Tạo lúc",
  ];

  const rows = tasks.map((t) => {
    const assignee = t.assigneeId ? getUser(t.assigneeId) : null;
    return [
      t.id,
      csvEscape(t.title),
      csvEscape(t.description),
      csvEscape(assignee?.name || ""),
      csvEscape(assignee?.email || ""),
      t.priority,
      t.status,
      new Date(t.dueDate).toLocaleDateString("vi-VN"),
      t.completedAt ? new Date(t.completedAt).toLocaleDateString("vi-VN") : "",
      new Date(t.createdAt).toLocaleDateString("vi-VN"),
    ];
  });

  const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
