"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { Task, User } from "@/types";

// Register font that supports Vietnamese
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: 300,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Roboto",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #1e293b",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 4,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottom: "1 solid #cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  col1: { width: "25%", paddingRight: 4 },
  col2: { width: "15%", paddingRight: 4 },
  col3: { width: "12%", paddingRight: 4 },
  col4: { width: "12%", paddingRight: 4 },
  col5: { width: "12%", textAlign: "center" },
  col6: { width: "12%", textAlign: "center" },
  col7: { width: "12%", paddingRight: 4 },
  stats: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
    border: "1 solid #e2e8f0",
  },
  statLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
});

interface TaskSummaryPDFProps {
  tasks: Task[];
  getUser: (id: string) => User | undefined;
  period: {
    from?: string;
    to?: string;
  };
}

export function TaskSummaryPDF({ tasks, getUser, period }: TaskSummaryPDFProps) {
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "completion_pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
    overdue: tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "cancelled" &&
        new Date(t.dueDate) < new Date()
    ).length,
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      in_progress: "Đang làm",
      completion_pending: "Chờ duyệt hoàn thành",
      completed: "Hoàn thành",
      rejection_pending: "Chờ duyệt hủy",
      cancelled: "Đã hủy",
    };
    return map[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const map: Record<string, string> = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
      urgent: "Khẩn cấp",
    };
    return map[priority] || priority;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Báo Cáo Công Việc</Text>
          <Text style={styles.subtitle}>
            Kỳ báo cáo:{" "}
            {period.from
              ? `${formatDate(period.from)} - ${formatDate(period.to || new Date().toISOString())}`
              : `Tất cả thời gian - Tạo ngày ${formatDate(new Date().toISOString())}`}
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng Quan</Text>
          <View style={styles.stats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tổng Tasks</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Chờ duyệt hoàn thành</Text>
              <Text style={styles.statValue}>{stats.pending}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Đang làm</Text>
              <Text style={styles.statValue}>{stats.inProgress}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Hoàn thành</Text>
              <Text style={styles.statValue}>{stats.completed}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Quá hạn</Text>
              <Text style={styles.statValue}>{stats.overdue}</Text>
            </View>
          </View>
        </View>

        {/* Tasks Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi Tiết Công Việc</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Tiêu đề</Text>
              <Text style={styles.col2}>Người nhận</Text>
              <Text style={styles.col3}>Ưu tiên</Text>
              <Text style={styles.col4}>Trạng thái</Text>
              <Text style={styles.col6}>Hạn chót</Text>
              <Text style={styles.col7}>Tạo lúc</Text>
            </View>

            {/* Table Rows */}
            {tasks.slice(0, 20).map((task) => {
              const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
              return (
                <View key={task.id} style={styles.tableRow}>
                  <Text style={styles.col1}>{task.title}</Text>
                  <Text style={styles.col2}>{assignee?.name || "Chưa giao"}</Text>
                  <Text style={styles.col3}>{getPriorityText(task.priority)}</Text>
                  <Text style={styles.col4}>{getStatusText(task.status)}</Text>
                  <Text style={styles.col6}>{formatDate(task.dueDate)}</Text>
                  <Text style={styles.col7}>{formatDate(task.createdAt)}</Text>
                </View>
              );
            })}
          </View>

          {tasks.length > 20 && (
            <Text style={{ marginTop: 10, fontSize: 9, color: "#64748b" }}>
              * Hiển thị 20/{tasks.length} tasks. Xuất CSV để xem đầy đủ.
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Team Manager - Báo cáo tự động - Tạo lúc{" "}
            {new Date().toLocaleString("vi-VN")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
