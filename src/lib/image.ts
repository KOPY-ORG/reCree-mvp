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
