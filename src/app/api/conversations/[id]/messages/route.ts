import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { sendMessageSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import {
  getDocument,
  getDocuments,
  createDocument,
  updateDocument,
  countDocuments,
  COLLECTIONS,
} from "@/lib/db";
import { Message, Conversation } from "@/types";

type Params = { params: Promise<{ id: string }> };
type FirestoreMessage = Omit<Message, "id">;
type FirestoreConversation = Omit<Conversation, "id">;
type FirestoreUser = { name: string; avatar?: string };

/** GET /api/conversations/[id]/messages */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const conv = await getDocument<FirestoreConversation>(
      COLLECTIONS.CONVERSATIONS,
      id
    );
    if (!conv) return jsonError("Không tìm thấy cuộc trò chuyện", 404);
    if (!conv.memberIds.includes(user.id))
      return jsonError("Forbidden", 403);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "30", 10)));

    const [total, messages] = await Promise.all([
      countDocuments(COLLECTIONS.MESSAGES, [
        { field: "conversationId", op: "==", value: id },
      ]),
      getDocuments<FirestoreMessage>(
        COLLECTIONS.MESSAGES,
        [{ field: "conversationId", op: "==", value: id }],
        {
          orderByField: "createdAt",
          orderDirection: "desc",
          offset: (page - 1) * pageSize,
          limitCount: pageSize,
        }
      ),
    ]);

    // Reverse to chronological order + enrich with sender info
    const chronological = [...messages].reverse();
    const enriched = await Promise.all(
      chronological.map(async (m) => {
        const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, m.userId);
        return {
          ...m,
          userName: u?.name || "Unknown",
          userAvatar: u?.avatar,
        };
      })
    );

    return jsonOk({
      data: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/conversations/[id]/messages */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const conv = await getDocument<FirestoreConversation>(
      COLLECTIONS.CONVERSATIONS,
      id
    );
    if (!conv) return jsonError("Không tìm thấy cuộc trò chuyện", 404);
    if (!conv.memberIds.includes(user.id))
      return jsonError("Forbidden", 403);

    const body = await req.json();
    const data = sendMessageSchema.parse(body);

    if (!data.content.trim() && data.attachments.length === 0) {
      return jsonError("Tin nhắn không được rỗng", 400);
    }

    const message = await createDocument<FirestoreMessage>(
      COLLECTIONS.MESSAGES,
      {
        conversationId: id,
        userId: user.id,
        content: data.content.trim(),
        attachments: data.attachments,
        createdAt: new Date().toISOString(),
      }
    );

    // Update conversation's last message preview
    const preview =
      data.content.trim() ||
      (data.attachments[0]?.type === "image" ? "📷 Ảnh" : "📎 Tệp đính kèm");

    await updateDocument(COLLECTIONS.CONVERSATIONS, id, {
      lastMessage: preview,
      lastMessageAt: message.createdAt,
    });

    const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, user.id);

    return jsonOk(
      {
        ...message,
        userName: u?.name || user.name,
        userAvatar: u?.avatar,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
