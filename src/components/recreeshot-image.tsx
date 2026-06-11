import Image from "next/image";
import { isExternalImage } from "@/lib/image";

/**
 * "preview"  — 업로드 미리보기: blur 글로우, rounded-2xl, "Match" 텍스트 기본 포함
 * "thumb-sm" — 90-120px 소형 카드 (홈, Explore 인라인, 포스트 상세): boxShadow, ref 22%, offset 4%
 * "thumb-md" — HallGrid 카드: boxShadow, ref 18%, offset 3%, 배지 약간 큼
 */
type Variant = "preview" | "thumb-sm" | "thumb-md";

interface ReCreeshotImageProps {
  shotUrl: string;
  referenceUrl?: string | null;
  referencePosition?: "top-left" | "bottom-left";
  variant?: Variant;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function ReCreeshotImage({
  shotUrl,
  referenceUrl,
  referencePosition = "bottom-left",
  variant = "preview",
  className = "",
  sizes = "100vw",
  priority,
}: ReCreeshotImageProps) {
  const isThumb = variant === "thumb-sm" || variant === "thumb-md";
  const isThumbSm = variant === "thumb-sm";

  // thumb 변형용 소스 이미지 파라미터
  const thumbOffset = isThumbSm ? "4%" : "3%";
  const thumbRefWidth = isThumbSm ? "22%" : "18%";
  const thumbOutline = isThumbSm
    ? "0.5px solid rgba(255,255,255,0.8)"
    : "0.75px solid rgba(255,255,255,0.8)";
  const thumbGlow = isThumbSm
    ? "0 0 8px 4px rgba(255,255,255,0.6)"
    : "0 0 12px 5px rgba(255,255,255,0.6)";

  // preview 변형용 소스 이미지 위치 (Canvas 1080×1350 기준)
  const previewTop = referencePosition === "top-left" ? "2.4%" : undefined;
  const previewBottom = referencePosition === "bottom-left" ? "2.4%" : undefined;

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

      {/* thumb 변형: boxShadow 글로우 */}
      {referenceUrl && isThumb && (
        <div
          className="absolute overflow-hidden"
          style={{
            top: referencePosition === "top-left" ? thumbOffset : undefined,
            bottom: referencePosition === "bottom-left" ? thumbOffset : undefined,
            left: thumbOffset,
            width: thumbRefWidth,
            aspectRatio: "4/5",
            outline: thumbOutline,
            boxShadow: thumbGlow,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 리크리샷 레퍼런스 오버레이: 외부 사용자 이미지 */}
          <img src={referenceUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* preview 변형: blur 글로우 (Canvas 비율 정확) */}
      {referenceUrl && !isThumb && (
        <div
          style={{
            position: "absolute",
            top: previewTop,
            bottom: previewBottom,
            left: "3%",
            width: "18%",
            aspectRatio: "4/5",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-8%",
              background: "rgba(255,255,255,0.3)",
              filter: "blur(0.6vw)",
              zIndex: -1,
            }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              outline: "0.5px solid rgba(255,255,255,0.8)",
            }}
          >
            <Image
              src={referenceUrl}
              alt="original"
              fill
              unoptimized={isExternalImage(referenceUrl)}
              className="object-cover"
              sizes="25vw"
            />
          </div>
        </div>
      )}

    </div>
  );
}
