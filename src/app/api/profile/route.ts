import { NextRequest } from "next/server";
import {
  getAuthUser,
  hashPassword,
  requireAuth,
  createToken,
  createRefreshToken,
  setAuthCookie,
  setRefreshCookie,
} from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk, toUserDto } from "@/lib/api-helpers";
import {
  getDocument,
  createDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/db";

type FirestoreUser = {
  name: string; email: string; role: string; position: string;
  phone: string; avatar: string | null; isActive: boolean; createdAt: string;
};

export async function GET() {
  try {
    const auth = requireAuth(await getAuthUser());
    const user = await getDocument<FirestoreUser>(COLLECTIONS.USERS, auth.id);
    if (!user) return jsonError("Không tìm thấy", 404);
    return jsonOk(toUserDto(user as Parameters<typeof toUserDto>[0]));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requireAuth(await getAuthUser());
    const body = await req.json();
    const data = profileUpdateSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.position !== undefined) update.position = data.position.trim();
    if (data.password && data.password.length > 0) {
      update.passwordHash = await hashPassword(data.password);
    }

    await updateDocument(COLLECTIONS.USERS, auth.id, update);
    const user = await getDocument<FirestoreUser>(COLLECTIONS.USERS, auth.id);
    if (!user) return jsonError("Không tìm thấy", 404);

    // Refresh tokens if name/position changed so JWT stays in sync
    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "member",
      position: user.position,
    };
    await setAuthCookie(await createToken(authUser));
    await setRefreshCookie(await createRefreshToken(authUser));

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: user.id,
      action: "update_profile",
      detail: `${user.name} cập nhật hồ sơ`,
    });

    return jsonOk({ user: toUserDto(user as Parameters<typeof toUserDto>[0]), authUser });
  } catch (err) {
    return handleApiError(err);
  }
}

