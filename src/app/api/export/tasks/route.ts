import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

/** Export tasks as CSV for admin reports */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (from || to) {
      const dueDate: { gte?: Date; lte?: Date } = {};
      if (from) dueDate.gte = new Date(from);
      if (to) dueDate.lte = new Date(to);
      where.dueDate = dueDate;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { name: true, email: true } },
        creator: { select: { name: true } },
      },
    });

    const header = [
      "ID",
      "Tiêu đề",
      "Mô tả",
      "Người nhận",
      "Email",
      "Người tạo",
      "Ưu tiên",
      "Trạng thái",
      "Tiến độ",
      "Hạn chót",
      "Hoàn thành",
      "Tạo lúc",
    ].join(",");

    const rows = tasks.map((t) =>
      [
        t.id,
        csvEscape(t.title),
        csvEscape(t.description),
        csvEscape(t.assignee?.name || ""),
        csvEscape(t.assignee?.email || ""),
        csvEscape(t.creator.name),
        t.priority,
        t.status,
        t.progress,
        t.dueDate.toISOString(),
        t.completedAt?.toISOString() || "",
        t.createdAt.toISOString(),
      ].join(",")
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
