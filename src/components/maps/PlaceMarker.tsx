"use client";

import { type MarkerGradient, gradientDirToSvgCoords } from "@/lib/map-utils";

interface PlaceMarkerProps {
  color: string;
  isSelected: boolean;
  isSaved: boolean;
  nameEn: string | null;
  postCount: number;
  placeId: string;
  gradient?: MarkerGradient;
}

// 핀 SVG: viewBox "0 0 28 36", 핀 머리 생성 원: center (14, 14), radius 14
// 글리프 공통 기준: 핀 머리 지름(28)의 약 50% → diameter 14, radius 7
const GX = 14;
const GY = 14;
const GR = 7;
// 글리프 공통 흰색 — 동그라미·북마크 동일 값
const GLYPH_FILL = "white";
const GLYPH_OPACITY = 0.85;
// Lucide Bookmark 24×24: 세로 18 units → 높이 = 2×GR이 되도록 scale 파생
const BM_SCALE = (2 * GR) / 18;
const BM_TX = GX - 12 * BM_SCALE;
const BM_TY = GY - 12 * BM_SCALE;

export function PlaceMarker({ color, isSelected, isSaved, nameEn, postCount, placeId, gradient }: PlaceMarkerProps) {
  const displayName = nameEn ?? "Unnamed";
  const countLabel = postCount > 9 ? "9+" : String(postCount);
  const hasGradient = !!(gradient?.colorHex2);
  const gradCoords = hasGradient ? gradientDirToSvgCoords(gradient!.gradientDir) : null;
  const gradStop = hasGradient ? Math.min(gradient!.gradientStop, 100) / 100 : 0;
  const gradientId = `grad-${placeId}`;

  return (
    <div
      className="relative"
      style={{
        transform: isSelected ? "scale(1.3) translateY(-4px)" : undefined,
        transformOrigin: "bottom center",
        transition: "transform 0.15s ease-out",
      }}
    >
      {/* 라벨 pill — selected일 때만, 이름만 */}
      {isSelected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-lg"
          style={{ bottom: "calc(100% + 6px)" }}
        >
          {displayName}
        </div>
      )}

      {/* 핀 본체 SVG */}
      <svg
        width="28"
        height="36"
        viewBox="-4 0 36 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="pin-shadow" x="-40%" y="-20%" width="180%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="black" floodOpacity="0.28" />
          </filter>
          {hasGradient && gradCoords && (
            <linearGradient id={gradientId} x1={gradCoords.x1} y1={gradCoords.y1} x2={gradCoords.x2} y2={gradCoords.y2}>
              <stop offset="0" stopColor={gradient!.colorHex} />
              <stop offset={gradStop} stopColor={gradient!.colorHex2!} />
            </linearGradient>
          )}
        </defs>
        {/* 지면 타원 그림자 — 핀 뒤 레이어 */}
        <ellipse cx="14" cy="35" rx="5" ry="1.8" fill="black" opacity={0.18} />
        <path
          d="M14 0C6.268 0 0 6.268 0 14C0 21.5 14 36 14 36C14 36 28 21.5 28 14C28 6.268 21.732 0 14 0Z"
          fill={hasGradient ? `url(#${gradientId})` : (gradient?.colorHex ?? color)}
          filter="url(#pin-shadow)"
        />
        {/* 글리프: saved→북마크 / else→동그라미 */}
        {isSaved ? (
          <path
            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
            fill={GLYPH_FILL}
            fillOpacity={GLYPH_OPACITY}
            stroke={GLYPH_FILL}
            strokeOpacity={GLYPH_OPACITY}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${BM_TX}, ${BM_TY}) scale(${BM_SCALE})`}
          />
        ) : (
          <circle cx={GX} cy={GY} r={GR} fill={GLYPH_FILL} fillOpacity={GLYPH_OPACITY} />
        )}
        {!isSaved && postCount >= 2 && (
          <text
            x={GX}
            y={GY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={countLabel.length > 1 ? 6.5 : 8}
            fontWeight="700"
            fill="#18181b"
            style={{ pointerEvents: "none" }}
          >
            {countLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
