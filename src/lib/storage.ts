/**
 * Supabase Storage 유틸리티
 * 버킷별 public URL prefix에서 Storage 경로를 추출하는 헬퍼를 생성합니다.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export function makeStorageExtractor(bucket: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  return function extractStoragePath(url: string): string | null {
    if (!url.startsWith(prefix)) return null;
    return url.slice(prefix.length);
  };
}

/** Storage 파일 삭제 (best-effort). 실패해도 에러를 throw하지 않음. */
export async function deleteStorageFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const client = createAdminClient();
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) console.error(`Storage 파일 삭제 오류 [${bucket}]:`, error.message);
  } catch (e) {
    console.error(`Storage 파일 삭제 오류 [${bucket}]:`, e);
  }
}
