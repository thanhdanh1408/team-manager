import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { getStorage } from "firebase-admin/storage";
import { getApps } from "firebase-admin/app";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
];

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = String(formData.get("purpose") || "chat");

    if (!file) return jsonError("Không tìm thấy file", 400);
    if (file.size > MAX_FILE_SIZE) return jsonError("File quá lớn (tối đa 10MB)", 400);
    if (!ALLOWED_TYPES.includes(file.type)) return jsonError("Loại file không được hỗ trợ", 400);
    if (!["chat", "report", "avatar"].includes(purpose)) return jsonError("Mục đích tải tệp không hợp lệ", 400);
    if (purpose === "avatar" && !file.type.startsWith("image/")) return jsonError("Ảnh đại diện phải là tệp hình ảnh", 400);

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return jsonError("Chưa cấu hình Firebase Storage. Vui lòng thêm FIREBASE_STORAGE_BUCKET.", 503);
    }

    const app = getApps()[0];
    const bucket = getStorage(app).bucket(bucketName);

    const ext = file.name.split(".").pop() || "";
    const safeName = `${purpose}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileRef = bucket.file(safeName);
    await fileRef.save(buffer, {
      contentType: file.type,
      metadata: { metadata: { uploadedBy: user.id } },
    });

    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${safeName}`;

    return jsonOk({
      url,
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file",
      size: file.size,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
