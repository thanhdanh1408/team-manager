import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { COLLECTIONS, getDocument, getDocuments } from "@/lib/db";
import { Conversation, Message } from "@/types";

type Params = { params: Promise<{ id: string }> };
type StoredConversation = Omit<Conversation, "id" | "members" | "displayName">;
type StoredMessage = Omit<Message, "id">;

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const conversation = await getDocument<StoredConversation>(COLLECTIONS.CONVERSATIONS, id);
    if (!conversation) return jsonError("Không tìm thấy cuộc trò chuyện", 404);
    if (!conversation.memberIds.includes(user.id)) return jsonError("Bạn không thuộc cuộc trò chuyện này", 403);

    const messages = await getDocuments<StoredMessage>(
      COLLECTIONS.MESSAGES,
      [{ field: "conversationId", op: "==", value: id }],
      { orderByField: "createdAt", orderDirection: "desc", limitCount: 500 }
    );
    const data = messages.flatMap((message) =>
      (message.attachments || []).map((attachment) => ({
        ...attachment,
        messageId: message.id,
        userId: message.userId,
        createdAt: message.createdAt,
      }))
    );
    return jsonOk({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
