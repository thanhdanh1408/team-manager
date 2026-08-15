import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-helpers";
import { getDocuments, updateDocument, updateDocuments, COLLECTIONS } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

    const filters: Array<{ field: string; op: "=="; value: unknown }> = [
      { field: "userId", op: "==", value: user.id },
    ];
    if (unreadOnly) filters.push({ field: "read", op: "==", value: false });

    const [items, unreadItems] = await Promise.all([
      getDocuments<{
        userId: string; title: string; message: string;
        type: string; link: string | null; read: boolean; createdAt: string;
      }>(COLLECTIONS.NOTIFICATIONS, [{ field: "userId", op: "==", value: user.id }], {
        orderByField: "createdAt", orderDirection: "desc", limitCount: 50,
      }),
      getDocuments(COLLECTIONS.NOTIFICATIONS, [
        { field: "userId", op: "==", value: user.id },
        { field: "read", op: "==", value: false },
      ]),
    ]);

    return jsonOk({
      data: items.map((n) => ({
        id: n.id, title: n.title, message: n.message,
        type: n.type, link: n.link, read: n.read, createdAt: n.createdAt,
      })),
      unreadCount: unreadItems.length,
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
      for (const id of ids) {
        await updateDocument(COLLECTIONS.NOTIFICATIONS, id, { read: true });
      }
    } else {
      await updateDocuments(
        COLLECTIONS.NOTIFICATIONS,
        [
          { field: "userId", op: "==", value: user.id },
          { field: "read", op: "==", value: false },
        ],
        { read: true }
      );
    }

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

