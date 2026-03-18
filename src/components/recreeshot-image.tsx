import Image from "next/image";

interface ReCreeshotImageProps {
  shotUrl: string;
  referenceUrl?: string | null;
  matchScore?: number | null;
  showBadge?: boolean;
  /** original 썸네일 위치 (기본: bottom-left) */
  referencePosition?: "top-left" | "bottom-left";
  /** 배지 위치 (기본: bottom-right) */
  badgePosition?: "top-right" | "bottom-right";
  /** 메인 이미지 둥근 모서리 여부 (기본: true) */
  rounded?: boolean;
  /** 배지에 "Match" 텍스트 포함 여부 (기본: true) */
  showMatchLabel?: boolean;
  /** 작은 카드용 compact 모드 — 배지 크기 축소, 오리지널 포토 여백 확보 */
  compact?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/** 리크리샷 이미지 공통 컴포넌트 — original 썸네일 + 배지 오버레이 포함
 *
 * 오리지널 포토 수치는 Canvas 저장 이미지(1080×1350)와 동일한 비율로 설정:
 *   width  = 18% of container width  (canvas: W × 0.18)
 *   top    = 2.4% of container height (canvas: W × 0.03 = H × 0.024, 4:5 기준)
 *   left   = 3% of container width   (canvas: W × 0.03)
 *   radius = 12% of thumb width      (canvas: thumbW × 0.12)
 *   glow   = blurred sibling div, inset -25% → 카드 크기에 비례
 */
export function ReCreeshotImage({
  shotUrl,
  referenceUrl,
  matchScore,
  showBadge = true,
  referencePosition = "bottom-left",
  badgePosition = "bottom-right",
  rounded = true,
  showMatchLabel = true,
  compact = false,
  className = "",
  sizes = "100vw",
  priority,
}: ReCreeshotImageProps) {
  // compact: 작은 카드(90~120px)용 — 배지·오리지널 포토 여백 축소
  const badgePositionClass = badgePosition === "top-right"
    ? compact ? "top-1.5 right-1.5" : "top-2 right-2"
    : compact ? "bottom-1.5 right-1.5" : "bottom-2 right-2";
  const badgeSizeClass = compact
    ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full"
    : "text-xs font-bold px-2.5 py-[3px] rounded-full";

  // compact 모드: 최소 5px 확보 (calc로 작은 카드에서도 모서리에서 띄움)
  const thumbLeft = compact ? "calc(max(5px, 5%))" : "3%";
  const thumbTop = referencePosition === "top-left"
    ? compact ? "calc(max(5px, 4%))" : "2.4%"
    : undefined;
  const thumbBottom = referencePosition === "bottom-left"
    ? compact ? "calc(max(5px, 4%))" : "2.4%"
    : undefined;

  return (
    <div
      className={`relative overflow-hidden bg-muted ${rounded ? "rounded-2xl" : ""} ${className}`}
    >
      <Image
        src={shotUrl}
        alt="recreeshot"
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />

      {referenceUrl && (
        // 외부 wrapper: 위치·크기 담당, overflow visible로 글로우 노출
        <div
          style={{
            position: "absolute",
            top: thumbTop,
            bottom: thumbBottom,
            left: thumbLeft,
            width: "18%",
            aspectRatio: "4/5",
            zIndex: 10,
          }}
        >
          {/* 비례 글로우: inset이 % 기반이라 카드 크기에 따라 자동 확대/축소 */}
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
          {/* 이미지 레이어 */}
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
          className={`absolute ${badgePositionClass} text-black ${badgeSizeClass}`}
          style={{
            background: "linear-gradient(to right, #C8FF09, white 150%)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {Math.round(matchScore)}%{showMatchLabel && " Match"}
        </div>
      )}
    </div>
  );
}
