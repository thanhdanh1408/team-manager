import { prisma } from "@/lib/db";

/** Create an in-app notification for a user */
export async function notifyUser(params: {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "task";
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "info",
        link: params.link || null,
      },
    });
  } catch (err) {
    console.error("[notifyUser]", err);
  }
}

/** Notify assignee when a new task is assigned */
export async function notifyTaskAssigned(
  assigneeId: string | null | undefined,
  taskTitle: string,
  _taskId: string
) {
  if (!assigneeId) return;
  await notifyUser({
    userId: assigneeId,
    title: "Công việc mới",
    message: `Bạn được giao task: ${taskTitle}`,
    type: "task",
    link: "/member/tasks",
  });
}
