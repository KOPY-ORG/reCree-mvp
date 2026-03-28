/**
 * next.config.ts의 remotePatterns에 등록된 도메인인지 확인합니다.
 * false → 미등록 외부 도메인 → <Image unoptimized> 필요
 */
export function isExternalImage(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    return !(
      hostname.endsWith(".supabase.co") ||
      hostname === "img.youtube.com" ||
      hostname === "i.ytimg.com" ||
      hostname === "lh3.googleusercontent.com" ||
      hostname === "picsum.photos"
    );
  } catch {
    // blob:, data: 등 파싱 불가 URL → 최적화 불필요
    return true;
  }
}
