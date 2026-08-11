import { getAuthUser, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = requireAuth(await getAuthUser());

    if (user.role === "member") {
      const tasks = await prisma.task.findMany({
        where: { assigneeId: user.id },
      });
      const evaluations = await prisma.evaluation.findMany({
        where: { memberId: user.id },
      });
      const avg =
        evaluations.length === 0
          ? 0
          : evaluations.reduce((s, e) => s + e.rating, 0) / evaluations.length;

      return jsonOk({
        totalTasks: tasks.length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        rejectionPending: tasks.filter((t) => t.status === "rejection_pending")
          .length,
        cancelledTasks: tasks.filter((t) => t.status === "cancelled").length,
        averageRating: Math.round(avg * 10) / 10,
      });
    }

    const [members, tasks] = await Promise.all([
      prisma.user.count({ where: { role: "member", isActive: true } }),
      prisma.task.findMany(),
    ]);

    const now = new Date();
    return jsonOk({
      totalMembers: members,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
      inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      rejectionPending: tasks.filter((t) => t.status === "rejection_pending")
        .length,
      cancelledTasks: tasks.filter((t) => t.status === "cancelled").length,
      overdueTasks: tasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "cancelled" &&
          t.dueDate < now
      ).length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
