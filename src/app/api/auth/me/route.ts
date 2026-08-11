import { getAuthUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);
    return jsonOk({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
