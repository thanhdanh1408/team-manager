import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { getDocument, getDocuments, COLLECTIONS } from "@/lib/db";

type FirestoreTask = {
  title: string; description: string; assigneeId: string | null;
  priority: string; status: string;
  dueDate: string; completedAt: string | null; createdAt: string;
  createdById: string;
};

type FirestoreUser = { name: string; email: string };

/** Export tasks as CSV for admin reports */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters: Array<{ field: string; op: "=="; value: unknown }> = [];
    if (status && status !== "all") {
      filters.push({ field: "status", op: "==", value: status });
    }

    let tasks = await getDocuments<FirestoreTask>(COLLECTIONS.TASKS, filters, {
      orderByField: "createdAt", orderDirection: "desc",
    });

    // Apply date filters in memory
    if (from) {
      const fromDate = new Date(from);
      tasks = tasks.filter((t) => new Date(t.dueDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      tasks = tasks.filter((t) => new Date(t.dueDate) <= toDate);
    }

    // Fetch assignee and creator info — use getDocument (by ID) with a cache
    const usersCache = new Map<string, FirestoreUser>();
    async function getUserCached(id: string | null) {
      if (!id) return null;
      if (usersCache.has(id)) return usersCache.get(id)!;
      const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, id);
      if (u) usersCache.set(id, u);
      return u ?? null;
    }

    const header = [
      "ID", "Tiêu đề", "Mô tả", "Người nhận", "Email",
      "Người tạo", "Ưu tiên", "Trạng thái",
      "Hạn chót", "Hoàn thành", "Tạo lúc",
    ].join(",");

    const rows = await Promise.all(
      tasks.map(async (t) => {
        const assignee = await getUserCached(t.assigneeId);
        const creator = await getUserCached(t.createdById);
        return [
          t.id,
          csvEscape(t.title),
          csvEscape(t.description),
          csvEscape(assignee?.name || ""),
          csvEscape(assignee?.email || ""),
          csvEscape(creator?.name || ""),
          t.priority,
          t.status,
          t.dueDate,
          t.completedAt || "",
          t.createdAt,
        ].join(",");
      })
    );

    const csv = "\uFEFF" + [header, ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

