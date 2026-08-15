import { getAuthUser, clearAuthCookie } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-helpers";
import { createDocument, COLLECTIONS } from "@/lib/db";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (user) {
      await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
        userId: user.id,
        action: "logout",
        detail: `${user.name} đăng xuất`,
      });
    }
    await clearAuthCookie();
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

