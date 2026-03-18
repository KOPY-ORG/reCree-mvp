import Image from "next/image";

/**
 * "preview"  — 업로드 미리보기: blur 글로우, rounded-2xl, "Match" 텍스트 기본 포함
 * "thumb-sm" — 90-120px 소형 카드 (홈, Explore 인라인, 포스트 상세): boxShadow, ref 22%, offset 4%
 * "thumb-md" — HallGrid 카드: boxShadow, ref 18%, offset 3%, 배지 약간 큼
 */
type Variant = "preview" | "thumb-sm" | "thumb-md";

interface ReCreeshotImageProps {
  shotUrl: string;
  referenceUrl?: string | null;
  matchScore?: number | null;
  showBadge?: boolean;
  showMatchLabel?: boolean;
  referencePosition?: "top-left" | "bottom-left";
  badgePosition?: "top-right" | "bottom-right";
  variant?: Variant;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function ReCreeshotImage({
  shotUrl,
  referenceUrl,
  matchScore,
  showBadge = true,
  showMatchLabel,
  referencePosition = "bottom-left",
  badgePosition = "bottom-right",
  variant = "preview",
  className = "",
  sizes = "100vw",
  priority,
}: ReCreeshotImageProps) {
  const isThumb = variant === "thumb-sm" || variant === "thumb-md";
  const isThumbSm = variant === "thumb-sm";

  // showMatchLabel: preview 기본 true, thumb 기본 false
  const showLabel = showMatchLabel ?? !isThumb;

  // 메인 이미지 둥근 모서리
  // thumb-sm(소형 인라인 카드): 비례 7%, thumb-md(HallGrid): 가이드 영상과 동일한 rounded-lg
  const roundedClass = variant === "thumb-sm" ? "rounded-[7%]" : "rounded-lg";

  // 배지 위치 / 크기
  let badgePosClass: string;
  let badgeSizeClass: string;
  let badgeShadow: string;
  if (variant === "thumb-sm") {
    badgePosClass = badgePosition === "top-right" ? "top-1 right-1" : "bottom-1 right-1";
    badgeSizeClass = "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none";
    badgeShadow = "0 1px 3px rgba(0,0,0,0.15)";
  } else if (variant === "thumb-md") {
    badgePosClass = badgePosition === "top-right" ? "top-1.5 right-1.5" : "bottom-1.5 right-1.5";
    badgeSizeClass = "text-[10px] font-bold px-2 py-0.5 rounded-full leading-none";
    badgeShadow = "0 1px 4px rgba(0,0,0,0.15)";
  } else {
    badgePosClass = badgePosition === "top-right" ? "top-2 right-2" : "bottom-2 right-2";
    badgeSizeClass = "text-xs font-bold px-2.5 py-[3px] rounded-full";
    badgeShadow = "0 2px 8px rgba(0,0,0,0.15)";
  }

  // thumb 변형용 소스 이미지 파라미터
  const thumbOffset = isThumbSm ? "4%" : "3%";
  const thumbRefWidth = isThumbSm ? "22%" : "18%";
  const thumbOutline = isThumbSm
    ? "1px solid rgba(255,255,255,0.9)"
    : "1.5px solid rgba(255,255,255,0.9)";
  const thumbGlow = isThumbSm
    ? "0 0 8px 4px rgba(255,255,255,0.6)"
    : "0 0 12px 5px rgba(255,255,255,0.6)";

  // preview 변형용 소스 이미지 위치 (Canvas 1080×1350 기준)
  const previewTop = referencePosition === "top-left" ? "2.4%" : undefined;
  const previewBottom = referencePosition === "bottom-left" ? "2.4%" : undefined;

  return (
    <div className={`relative overflow-hidden bg-muted ${roundedClass} ${className}`}>
      <Image
        src={shotUrl}
        alt="recreeshot"
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />

      {/* thumb 변형: boxShadow 글로우 */}
      {referenceUrl && isThumb && (
        <div
          className="absolute rounded-[10%] overflow-hidden"
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
              inset: "-25%",
              borderRadius: "16%",
              background: "rgba(255,255,255,0.55)",
              filter: "blur(8px)",
              zIndex: -1,
            }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "12%",
              overflow: "hidden",
              outline: "1px solid white",
            }}
          >
            <Image
              src={referenceUrl}
              alt="original"
              fill
              className="object-cover"
              sizes="25vw"
            />
          </div>
        </div>
      )}

      {showBadge && matchScore != null && (
        <div
          className={`absolute ${badgePosClass} text-black ${badgeSizeClass}`}
          style={{
            background: "linear-gradient(to right, #C8FF09, white 150%)",
            boxShadow: badgeShadow,
          }}
        >
          {Math.round(matchScore)}%{showLabel && " Match"}
        </div>
      )}
    </div>
  );
}
