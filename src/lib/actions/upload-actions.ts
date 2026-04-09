"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadFile, deleteStorageFiles } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** 리크리샷 이미지 R2 업로드 */
export async function uploadReCreeshotImage(
  formData: FormData,
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadFile("recreeshot-images", path, buffer, file.type);
    return { url, path };
  } catch (e) {
    console.error("리크리샷 이미지 업로드 오류:", e);
    return { error: "업로드 실패. 다시 시도해주세요." };
  }
}

/** 리크리샷 고아 파일 삭제 (이탈 시 정리용) */
export async function deleteReCreeshotImages(paths: string[]): Promise<void> {
  await deleteStorageFiles("recreeshot-images", paths);
}

/** 장소 이미지 R2 업로드 */
export async function uploadPlaceImageAction(
  formData: FormData,
  placeId: string,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: `${file.name}: jpg, png, webp 형식만 지원합니다.` };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { error: `${file.name}: 파일 크기가 5MB를 초과합니다.` };
  }

  const ext = file.name.split(".").pop();
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadFile("place-images", path, buffer, file.type);
    return { url };
  } catch (e) {
    console.error("장소 이미지 업로드 오류:", e);
    return { error: "업로드 실패" };
  }
}

/** 포스트 이미지 R2 업로드 */
export async function uploadPostImage(
  formData: FormData,
  folderPath: string,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: `${file.name}: jpg, png, webp 형식만 지원합니다.` };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { error: `${file.name}: 파일 크기가 5MB를 초과합니다.` };
  }

  const ext = file.name.split(".").pop();
  const path = `${folderPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadFile("post-images", path, buffer, file.type);
    return { url };
  } catch (e) {
    console.error("포스트 이미지 업로드 오류:", e);
    return { error: "업로드 실패" };
  }
}
