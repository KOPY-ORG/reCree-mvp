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
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/** 리크리샷 이미지 공통 컴포넌트 — original 썸네일 + 배지 오버레이 포함 */
export function ReCreeshotImage({
  shotUrl,
  referenceUrl,
  matchScore,
  showBadge = true,
  referencePosition = "bottom-left",
  badgePosition = "bottom-right",
  rounded = true,
  showMatchLabel = true,
  className = "",
  sizes = "100vw",
  priority,
}: ReCreeshotImageProps) {
  const badgePositionClass =
    badgePosition === "top-right" ? "top-2 right-2" : "bottom-2 right-2";

  const refStyle: React.CSSProperties = {
    position: "absolute",
    width: "22%",
    aspectRatio: "3/4",
    overflow: "hidden",
    borderRadius: "15%",
    backdropFilter: "blur(4px)",
    boxShadow: "0 0 0 1.5px white, 0 0 6px 2px rgba(255,255,255,0.2)",
    ...(referencePosition === "top-left"
      ? { top: 8, left: 8 }
      : { bottom: 8, left: 8 }),
  };

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
        <div style={refStyle}>
          <Image
            src={referenceUrl}
            alt="original"
            fill
            className="object-cover"
            sizes="25vw"
          />
        </div>
      )}

      {showBadge && matchScore != null && (
        <div
          className={`absolute ${badgePositionClass} text-black text-xs font-bold px-2.5 py-1 rounded-full`}
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
