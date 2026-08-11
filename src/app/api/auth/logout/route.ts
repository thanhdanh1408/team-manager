import { getAuthUser, clearAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api-helpers";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (user) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "logout",
          detail: `${user.name} đăng xuất`,
        },
      });
    }
    await clearAuthCookie();
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
