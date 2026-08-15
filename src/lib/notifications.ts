import { createDocument, COLLECTIONS } from "@/lib/db";

/** Create an in-app notification for a user */
export async function notifyUser(params: {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "task";
  link?: string;
}) {
  try {
    await createDocument(COLLECTIONS.NOTIFICATIONS, {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      link: params.link || null,
      read: false,
    });
  } catch (err) {
    console.error("[notifyUser]", err);
  }
}

/** Notify assignee when a new task is assigned */
export async function notifyTaskAssigned(
  assigneeId: string | null | undefined,
  taskTitle: string,
  taskId: string
) {
  if (!assigneeId) return;
  await notifyUser({
    userId: assigneeId,
    title: "Công việc mới",
    message: `Bạn được giao task: ${taskTitle}`,
    type: "task",
    link: `/member/tasks`,
  });
  // taskId reserved for future deep-link support
  void taskId;
}

