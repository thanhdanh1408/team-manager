import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { getDocuments, getDocument, createDocument, deleteDocument, countDocuments, COLLECTIONS } from "@/lib/db";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

type FirestoreMessage = {
  userId: string; content: string; createdAt: string;
};

type FirestoreUser = { name: string; role: string; position: string };

// Legacy global chat endpoint â€” kept for backward compat, now backed by MESSAGES collection
export async function GET(req: NextRequest) {
  try {
    requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10))
    );

    const [total, paginated] = await Promise.all([
      countDocuments(COLLECTIONS.MESSAGES, []),
      getDocuments<FirestoreMessage>(
        COLLECTIONS.MESSAGES,
        [],
        {
          orderByField: "createdAt",
          orderDirection: "desc",
          offset: (page - 1) * pageSize,
          limitCount: pageSize,
        }
      ),
    ]);

    const chronological = [...paginated].reverse();

    const result = await Promise.all(
      chronological.map(async (m) => {
        const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, m.userId);
        return {
          id: m.id, userId: m.userId,
          userName: u?.name || "Unknown", userRole: u?.role || "member",
          userPosition: u?.position || "", content: m.content, createdAt: m.createdAt,
        };
      })
    );

    return jsonOk({
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const body = await req.json();
    const data = messageSchema.parse(body);

    const message = await createDocument(COLLECTIONS.MESSAGES, {
      userId: user.id,
      content: data.content.trim(),
    });

    return jsonOk(
      {
        id: message.id, userId: message.userId as string,
        userName: user.name, userRole: user.role,
        userPosition: user.position, content: message.content as string,
        createdAt: (message.createdAt as string) || new Date().toISOString(),
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return jsonError("Missing id", 400);

    const msg = await getDocument<{ userId: string }>(COLLECTIONS.MESSAGES, id);
    if (!msg) return jsonError("Not found", 404);
    if (msg.userId !== user.id && user.role !== "admin")
      return jsonError("Forbidden", 403);

    await deleteDocument(COLLECTIONS.MESSAGES, id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
