import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import {
  rejectTaskSchema,
  progressSchema,
  reassignSchema,
} from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toTaskDto,
} from "@/lib/api-helpers";
import { notifyUser, notifyTaskAssigned } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/middleware";


type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const action = body.action as string;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError("Không tìm thấy task", 404);

    switch (action) {
      case "accept": {
        if (task.assigneeId !== user.id || task.status !== "pending") {
          return jsonError("Không thể đồng ý task này", 400);
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { status: "in_progress" },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "accept_task",
            detail: `Đồng ý nhận task: ${task.title}`,
          },
        });
        return jsonOk(toTaskDto(updated));
      }

      case "reject": {
        if (task.assigneeId !== user.id || task.status !== "pending") {
          return jsonError("Không thể từ chối task này", 400);
        }
        const { reason } = rejectTaskSchema.parse(body);
        const updated = await prisma.task.update({
          where: { id },
          data: { status: "rejection_pending", rejectionReason: reason },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "reject_task",
            detail: `Yêu cầu từ chối task: ${task.title}`,
          },
        });
        if (task.createdById) {
          await notifyUser({
            userId: task.createdById,
            title: "Yêu cầu từ chối task",
            message: `${user.name} muốn từ chối: ${task.title}`,
            type: "warning",
            link: "/admin/tasks",
          });
        }
        return jsonOk(toTaskDto(updated));
      }


      case "approve_rejection": {
        requireAdmin(user);
        if (task.status !== "rejection_pending") {
          return jsonError("Task không ở trạng thái chờ duyệt hủy", 400);
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { status: "cancelled", progress: 0 },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "approve_rejection",
            detail: `Duyệt hủy task: ${task.title}`,
          },
        });
        return jsonOk(toTaskDto(updated));
      }

      case "deny_rejection": {
        requireAdmin(user);
        if (task.status !== "rejection_pending") {
          return jsonError("Task không ở trạng thái chờ duyệt hủy", 400);
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { status: "pending", rejectionReason: null },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "deny_rejection",
            detail: `Từ chối yêu cầu hủy task: ${task.title}`,
          },
        });
        return jsonOk(toTaskDto(updated));
      }

      case "progress": {
        if (task.assigneeId !== user.id || task.status !== "in_progress") {
          return jsonError("Không thể cập nhật tiến độ", 400);
        }
        const { progress } = progressSchema.parse(body);
        const clamped = Math.max(0, Math.min(100, progress));
        const updateData: Record<string, unknown> = { progress: clamped };
        if (clamped === 100) {
          updateData.status = "completed";
          updateData.completedAt = new Date();
        }
        const updated = await prisma.task.update({
          where: { id },
          data: updateData,
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: clamped === 100 ? "complete_task" : "update_progress",
            detail:
              clamped === 100
                ? `Hoàn thành task: ${task.title}`
                : `Cập nhật tiến độ "${task.title}" → ${clamped}%`,
          },
        });
        return jsonOk(toTaskDto(updated));
      }

      case "reassign": {
        requireAdmin(user);
        const { assigneeId } = reassignSchema.parse(body);
        const member = await prisma.user.findUnique({
          where: { id: assigneeId },
        });
        if (!member) return jsonError("Không tìm thấy thành viên", 404);
        const updated = await prisma.task.update({
          where: { id },
          data: {
            assigneeId,
            status: "pending",
            progress: 0,
            rejectionReason: null,
          },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "reassign_task",
            detail: `Giao lại task "${task.title}" cho ${member.name}`,
          },
        });
        await notifyTaskAssigned(assigneeId, task.title, id);
        return jsonOk(toTaskDto(updated));
      }


      default:
        return jsonError("Action không hợp lệ", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
