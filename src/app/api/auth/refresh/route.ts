import { cookies } from "next/headers";
import {
  createRefreshToken,
  createToken,
  setAuthCookie,
  setRefreshCookie,
  verifyRefreshToken,
} from "@/lib/auth";
import { REFRESH_COOKIE } from "@/constants";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { getDocument, COLLECTIONS } from "@/lib/db";

/**
 * Exchange refresh token for a new access + refresh token pair (rotation).
 */
export async function POST() {
  try {
    const store = await cookies();
    const refresh = store.get(REFRESH_COOKIE)?.value;
    if (!refresh) {
      return jsonError("Không có refresh token", 401);
    }

    const payload = await verifyRefreshToken(refresh);
    if (!payload) {
      return jsonError("Refresh token không hợp lệ", 401);
    }

    const user = await getDocument<{
      name: string;
      email: string;
      role: string;
      position: string;
      isActive: boolean;
    }>(COLLECTIONS.USERS, payload.id);

    if (!user || !user.isActive) {
      return jsonError("Tài khoản không hợp lệ", 401);
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "member",
      position: user.position,
    };

    const accessToken = await createToken(authUser);
    const newRefresh = await createRefreshToken(authUser);
    await setAuthCookie(accessToken);
    await setRefreshCookie(newRefresh);
    await setCsrfCookie(generateCsrfToken());

    return jsonOk({ user: authUser });
  } catch (err) {
    return handleApiError(err);
  }
}

