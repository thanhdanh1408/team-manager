import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

    const where: { userId: string; read?: boolean } = { userId: user.id };
    if (unreadOnly) where.read = false;

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return jsonOk({
      data: items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Mark all as read, or body.ids specific */
export async function PATCH(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = body.ids;

    if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { userId: user.id, id: { in: ids } },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    }

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
