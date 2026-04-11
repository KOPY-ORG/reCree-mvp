"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteStorageFiles, getPresignedPutUrl } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES } from "@/lib/upload-constants";

/** 포스트 이미지 브라우저 직접 업로드용 Presigned URL 발급 */
export async function getPostImagePresignedUrl(
  filename: string,
  contentType: string,
  folderPath: string,
): Promise<{ presignedUrl: string; cdnUrl: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return { error: `jpg, png, webp 형식만 지원합니다.` };
  }
  const ext = filename.split(".").pop() ?? "jpg";
  const path = `${folderPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    return await getPresignedPutUrl("post-images", path, contentType);
  } catch (e) {
    console.error("Presigned URL 생성 오류:", e);
    return { error: "업로드 준비 실패. 다시 시도해주세요." };
  }
}

/** 장소 이미지 브라우저 직접 업로드용 Presigned URL 발급 */
export async function getPlaceImagePresignedUrl(
  filename: string,
  contentType: string,
  placeId: string,
): Promise<{ presignedUrl: string; cdnUrl: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return { error: `jpg, png, webp 형식만 지원합니다.` };
  }
  const ext = filename.split(".").pop() ?? "jpg";
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    return await getPresignedPutUrl("place-images", path, contentType);
  } catch (e) {
    console.error("장소 이미지 Presigned URL 생성 오류:", e);
    return { error: "업로드 준비 실패. 다시 시도해주세요." };
  }
}

/** 리크리샷 이미지 브라우저 직접 업로드용 Presigned URL 발급 (path 반환 - 고아 파일 정리용) */
export async function getReCreeshotPresignedUrl(
  filename: string,
  contentType: string,
): Promise<{ presignedUrl: string; cdnUrl: string; path: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ext = filename.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    const { presignedUrl, cdnUrl } = await getPresignedPutUrl("recreeshot-images", path, contentType);
    return { presignedUrl, cdnUrl, path };
  } catch (e) {
    console.error("리크리샷 Presigned URL 생성 오류:", e);
    return { error: "업로드 준비 실패. 다시 시도해주세요." };
  }
}

/** 프로필 이미지 브라우저 직접 업로드용 Presigned URL 발급 */
export async function getProfileImagePresignedUrl(
  filename: string,
  contentType: string,
): Promise<{ presignedUrl: string; cdnUrl: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ext = filename.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  try {
    return await getPresignedPutUrl("profile-images", path, contentType);
  } catch (e) {
    console.error("프로필 이미지 Presigned URL 생성 오류:", e);
    return { error: "업로드 준비 실패. 다시 시도해주세요." };
  }
}

/** 리크리샷 고아 파일 삭제 (이탈 시 정리용) */
export async function deleteReCreeshotImages(paths: string[]): Promise<void> {
  await deleteStorageFiles("recreeshot-images", paths);
}
