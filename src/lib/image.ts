/**
 * maxWidth보다 작은 이미지는 리사이즈하지 않습니다.
 * 실패 시 원본 파일을 그대로 반환합니다.
 */
export function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  const JPEG = "image/jpeg";
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: JPEG }));
        },
        JPEG,
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * focalX/focalY/zoom으로 이미지 object-position + transform 스타일을 생성합니다.
 */
export function focalStyle(
  focalX?: number | null,
  focalY?: number | null,
  zoom?: number | null,
): React.CSSProperties {
  const x = (focalX ?? 0.5) * 100;
  const y = (focalY ?? 0.5) * 100;
  const z = zoom ?? 1;
  return {
    objectPosition: `${x}% ${y}%`,
    ...(z > 1 && { transform: `scale(${z})`, transformOrigin: `${x}% ${y}%` }),
  };
}

/**
 * Vercel Image Optimization을 사용하지 않아야 하는 이미지인지 확인합니다.
 * R2 CDN 이미지는 Cloudflare에서 이미 최적화됩니다.
 */
/**
 * 동일한 구글 포토의 URL이 size 파라미터만 달라도 같은 사진으로 인식하는 dedup key.
 * - lh3.googleusercontent.com/places/PHOTO_ID=s1600 → "PHOTO_ID" 추출
 * - maps.googleapis.com photo_reference 파라미터 추출
 * - 그 외 URL은 그대로 사용
 */
export function photoKey(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "lh3.googleusercontent.com") {
      // pathname: /places/PHOTO_ID=s1600-w1600 → PHOTO_ID
      return u.pathname.split("=")[0];
    }
    const ref = u.searchParams.get("photo_reference");
    if (ref) return ref;
    return url;
  } catch {
    return url;
  }
}

interface CarouselPlace {
  posts: Array<{ imageUrl: string | null; images: string[]; topics: unknown[] }>;
  imageUrl: string | null;
  placeImages: Array<{ url: string }>;
}

/**
 * 장소의 이미지를 우선순위(포스트 썸네일 → 포스트 나머지 이미지 → 장소 이미지)에 따라
 * 중복 없이 반환합니다. 토픽 있는 포스트가 먼저 옵니다.
 */
export function buildPlaceCarouselUrls(place: CarouselPlace): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const add = (url: string | null | undefined) => {
    if (!url) return;
    const key = photoKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };
  const sortedPosts = [...place.posts].sort((a, b) =>
    (b.topics.length > 0 ? 1 : 0) - (a.topics.length > 0 ? 1 : 0)
  );
  sortedPosts.forEach((p) => add(p.imageUrl));
  sortedPosts.flatMap((p) => p.images).forEach(add);
  add(place.imageUrl);
  place.placeImages.forEach((img) => add(img.url));
  return urls;
}

export function isExternalImage(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    if (hostname === "cdn.recree.io") return true;
    return !(
      hostname === "img.youtube.com" ||
      hostname === "i.ytimg.com" ||
      hostname === "lh3.googleusercontent.com" ||
      hostname === "picsum.photos"
    );
  } catch {
    return true;
  }
}
