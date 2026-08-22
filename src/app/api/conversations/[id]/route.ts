import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { conversationUpdateSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { COLLECTIONS, getDocument, updateDocument } from "@/lib/db";
import { Conversation } from "@/types";

type Params = { params: Promise<{ id: string }> };
type StoredConversation = Omit<Conversation, "id" | "members" | "displayName">;
type StoredUser = { name: string; avatar?: string; isActive?: boolean };

async function enrichConversation(id: string, conversation: StoredConversation) {
  const members = await Promise.all(
    conversation.memberIds.map(async (memberId) => {
      const member = await getDocument<StoredUser>(COLLECTIONS.USERS, memberId);
      return { id: memberId, name: member?.name || "Không xác định", avatar: member?.avatar };
    })
  );
  return { ...conversation, id, members, displayName: conversation.name || "Nhóm chat" };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const conversation = await getDocument<StoredConversation>(COLLECTIONS.CONVERSATIONS, id);
    if (!conversation) return jsonError("Không tìm thấy cuộc trò chuyện", 404);
    if (!conversation.memberIds.includes(user.id)) return jsonError("Bạn không thuộc cuộc trò chuyện này", 403);
    return jsonOk(await enrichConversation(id, conversation));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const conversation = await getDocument<StoredConversation>(COLLECTIONS.CONVERSATIONS, id);
    if (!conversation) return jsonError("Không tìm thấy cuộc trò chuyện", 404);
    if (conversation.type !== "group") return jsonError("Chỉ nhóm chat mới có thể cập nhật thành viên", 400);
    if (conversation.createdById !== user.id && user.role !== "admin") {
      return jsonError("Chỉ người tạo nhóm hoặc quản trị viên có thể chỉnh sửa", 403);
    }

    const data = conversationUpdateSchema.parse(await req.json());
    const memberIds = data.memberIds
      ? Array.from(new Set([conversation.createdById, ...data.memberIds]))
      : conversation.memberIds;
    const memberRecords = await Promise.all(
      memberIds.map((memberId) => getDocument<StoredUser>(COLLECTIONS.USERS, memberId))
    );
    if (memberRecords.some((member) => !member || member.isActive === false)) {
      return jsonError("Danh sách thành viên có tài khoản không hợp lệ", 400);
    }

    await updateDocument(COLLECTIONS.CONVERSATIONS, id, {
      ...(data.name ? { name: data.name.trim() } : {}),
      memberIds,
    });
    const updated = await getDocument<StoredConversation>(COLLECTIONS.CONVERSATIONS, id);
    return jsonOk(await enrichConversation(id, updated!));
  } catch (error) {
    return handleApiError(error);
  }
}
