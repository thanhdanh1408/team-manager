import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-helpers";
import { getDocuments, countDocuments, COLLECTIONS } from "@/lib/db";

export async function GET() {
  try {
    const user = requireAuth(await getAuthUser());

    if (user.role === "member") {
      const [tasks, evaluations] = await Promise.all([
        getDocuments<{ status: string }>(COLLECTIONS.TASKS, [
          { field: "assigneeId", op: "==", value: user.id },
        ]),
        getDocuments<{ rating: number }>(COLLECTIONS.EVALUATIONS, [
          { field: "memberId", op: "==", value: user.id },
        ]),
      ]);
      const avg =
        evaluations.length === 0
          ? 0
          : evaluations.reduce((s, e) => s + e.rating, 0) / evaluations.length;

      return jsonOk({
        totalTasks: tasks.length,
        pendingTasks: 0,
        inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
        completionPending: tasks.filter((t) => t.status === "completion_pending").length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        rejectionPending: tasks.filter((t) => t.status === "rejection_pending").length,
        cancelledTasks: tasks.filter((t) => t.status === "cancelled").length,
        averageRating: Math.round(avg * 10) / 10,
      });
    }

    // Admin: use countDocuments to avoid fetching all task documents
    const [
      totalMembers,
      totalTasks,
      inProgressTasks,
      completionPending,
      completedTasks,
      rejectionPending,
      cancelledTasks,
      overdueTasks,
    ] = await Promise.all([
      countDocuments(COLLECTIONS.USERS, [
        { field: "role", op: "==", value: "member" },
        { field: "isActive", op: "==", value: true },
      ]),
      countDocuments(COLLECTIONS.TASKS, []),
      countDocuments(COLLECTIONS.TASKS, [{ field: "status", op: "==", value: "in_progress" }]),
      countDocuments(COLLECTIONS.TASKS, [{ field: "status", op: "==", value: "completion_pending" }]),
      countDocuments(COLLECTIONS.TASKS, [{ field: "status", op: "==", value: "completed" }]),
      countDocuments(COLLECTIONS.TASKS, [{ field: "status", op: "==", value: "rejection_pending" }]),
      countDocuments(COLLECTIONS.TASKS, [{ field: "status", op: "==", value: "cancelled" }]),
      // Overdue: tasks not completed/cancelled with dueDate < now
      // Firestore doesn't support "not in" + date range easily in one query,
      // so we fetch only the minimal fields needed for the overdue check.
      getDocuments<{ status: string; dueDate: string }>(COLLECTIONS.TASKS, [], {}).then(
        (tasks) => {
          const now = new Date();
          return tasks.filter(
            (t) =>
              t.status !== "completed" &&
              t.status !== "cancelled" &&
              new Date(t.dueDate) < now
          ).length;
        }
      ),
    ]);

    return jsonOk({
      totalMembers,
      totalTasks,
      pendingTasks: 0,
      inProgressTasks,
      completionPending,
      completedTasks,
      rejectionPending,
      cancelledTasks,
      overdueTasks,
    });
  } catch (err) {
    return handleApiError(err);
  }
}


