import Image from "next/image";
import { isExternalImage } from "@/lib/image";

const OVERLAY =
  "linear-gradient(180deg, rgba(10,6,9,.42) 0%, transparent 22%, transparent 52%, rgba(10,6,9,.34) 100%)";

const FALLBACK =
  "linear-gradient(135deg, #F01941 0%, #2A0410 100%)";

interface EventImageProps {
  src: string | null | undefined;
  alt: string;
  /** CSS aspect-ratio 값. 예: "4/3", "16/9". 기본 "4/3" */
  ratio?: string;
  priority?: boolean;
  /** next/image sizes 속성. 기본 "100vw" */
  sizes?: string;
  className?: string;
  /** true면 상단에 이벤트 표준 오버레이 그라데이션을 렌더 */
  overlay?: boolean;
}

export function EventImage({
  src,
  alt,
  ratio = "4/3",
  priority = false,
  sizes = "100vw",
  className,
  overlay = false,
}: EventImageProps) {
  return (
    <div
      className={`relative w-full overflow-hidden${className ? ` ${className}` : ""}`}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <>
          {/* 배경 레이어 — 블러 확대로 letterbox 영역 채움 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
          />

          {/* 전경 레이어 — object-contain으로 원본 비율 보존 */}
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes={sizes}
            priority={priority}
            unoptimized={isExternalImage(src)}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: FALLBACK }}
        />
      )}

      {overlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: OVERLAY }}
        />
      )}
    </div>
  );
}
