import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { bulkTaskSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { notifyTaskAssigned } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(await getAuthUser());
    const body = await req.json();
    const data = bulkTaskSchema.parse(body);

    if (data.action === "delete") {
      const result = await prisma.task.deleteMany({
        where: { id: { in: data.ids } },
      });
      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "bulk_delete_tasks",
          detail: `Xóa hàng loạt ${result.count} task`,
        },
      });
      return jsonOk({ deleted: result.count });
    }

    if (data.action === "reassign") {
      if (!data.assigneeId) {
        return jsonError("Cần chọn thành viên", 400);
      }
      const result = await prisma.task.updateMany({
        where: { id: { in: data.ids } },
        data: {
          assigneeId: data.assigneeId,
          status: "pending",
          progress: 0,
          rejectionReason: null,
          completedAt: null,
        },
      });
      const tasks = await prisma.task.findMany({
        where: { id: { in: data.ids } },
        select: { id: true, title: true },
      });
      for (const t of tasks) {
        await notifyTaskAssigned(data.assigneeId, t.title, t.id);
      }
      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "bulk_reassign",
          detail: `Giao lại ${result.count} task`,
        },
      });
      return jsonOk({ updated: result.count });
    }

    if (data.action === "priority") {
      if (!data.priority) {
        return jsonError("Cần chọn mức ưu tiên", 400);
      }
      const result = await prisma.task.updateMany({
        where: { id: { in: data.ids } },
        data: { priority: data.priority },
      });
      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "bulk_priority",
          detail: `Đổi priority ${result.count} task → ${data.priority}`,
        },
      });
      return jsonOk({ updated: result.count });
    }

    return jsonError("Action không hợp lệ", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
