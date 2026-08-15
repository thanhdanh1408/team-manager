import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { conversationCreateSchema } from "@/lib/validations";
import { handleApiError, jsonOk } from "@/lib/api-helpers";
import {
  getDocuments,
  createDocument,
  getDocument,
  COLLECTIONS,
} from "@/lib/db";
import { Conversation } from "@/types";

type FirestoreConversation = Omit<Conversation, "id">;
type FirestoreUser = { name: string; avatar?: string };

/** GET /api/conversations — list conversations for current user */
export async function GET(_req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());

    const conversations = await getDocuments<FirestoreConversation>(
      COLLECTIONS.CONVERSATIONS,
      [{ field: "memberIds", op: "array-contains", value: user.id }],
      { orderByField: "lastMessageAt", orderDirection: "desc" }
    );

    // Enrich with member info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const members = await Promise.all(
          conv.memberIds.map(async (uid) => {
            const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, uid);
            return { id: uid, name: u?.name || "Unknown", avatar: u?.avatar };
          })
        );

        // For direct chats, derive display name from the other member
        let displayName = conv.name;
        if (conv.type === "direct" && !displayName) {
          const other = members.find((m) => m.id !== user.id);
          displayName = other?.name || "Direct";
        }

        return { ...conv, members, displayName };
      })
    );

    return jsonOk({ data: enriched });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/conversations — create or find existing direct conversation */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const body = await req.json();
    const data = conversationCreateSchema.parse(body);

    // Ensure creator is always a member
    const memberIds = Array.from(new Set([user.id, ...data.memberIds]));

    // For direct conversations: check if one already exists
    if (data.type === "direct" && memberIds.length === 2) {
      const existing = await getDocuments<FirestoreConversation>(
        COLLECTIONS.CONVERSATIONS,
        [
          { field: "type", op: "==", value: "direct" },
          { field: "memberIds", op: "array-contains", value: user.id },
        ]
      );
      const found = existing.find(
        (c) =>
          c.memberIds.length === 2 &&
          memberIds.every((id) => c.memberIds.includes(id))
      );
      if (found) return jsonOk(found);
    }

    const conv = await createDocument<FirestoreConversation>(
      COLLECTIONS.CONVERSATIONS,
      {
        type: data.type,
        name: data.name,
        memberIds,
        createdById: user.id,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
      }
    );

    return jsonOk(conv, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
