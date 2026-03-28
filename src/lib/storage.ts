/**
 * Supabase Storage 유틸리티
 * 버킷별 public URL prefix에서 Storage 경로를 추출하는 헬퍼를 생성합니다.
 */

export function makeStorageExtractor(bucket: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  return function extractStoragePath(url: string): string | null {
    if (!url.startsWith(prefix)) return null;
    return url.slice(prefix.length);
  };
}
