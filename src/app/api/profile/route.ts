import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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

export async function GET() {
  try {
    const auth = requireAuth(await getAuthUser());
    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) return jsonError("Không tìm thấy", 404);
    return jsonOk(toUserDto(user));
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

    const user = await prisma.user.update({
      where: { id: auth.id },
      data: update,
    });

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

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "update_profile",
        detail: `${user.name} cập nhật hồ sơ`,
      },
    });

    return jsonOk({ user: toUserDto(user), authUser });
  } catch (err) {
    return handleApiError(err);
  }
}
