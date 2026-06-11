import Image from "next/image";
import { isExternalImage } from "@/lib/image";

/**
 * "preview"  — 업로드 미리보기
 * "thumb-sm" — 소형 카드 (홈, Explore 인라인, 포스트 상세)
 * "thumb-md" — HallGrid 카드
 */
type Variant = "preview" | "thumb-sm" | "thumb-md";

interface ReCreeshotImageProps {
  shotUrl: string;
  variant?: Variant;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function ReCreeshotImage({
  shotUrl,
  variant = "preview",
  className = "",
  sizes = "100vw",
  priority,
}: ReCreeshotImageProps) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      <Image
        src={shotUrl}
        alt="recreeshot"
        fill
        unoptimized={isExternalImage(shotUrl)}
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
