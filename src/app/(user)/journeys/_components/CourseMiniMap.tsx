"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

// EventLocationMap.tsx 를 복사해 개조했다. 원본은 건드리지 않는다.
// 바뀐 곳 — 핀 색을 props 로 받고, 번호를 호출부가 매기고, SVG filter id 를 분리했다.

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type CoordPoint = {
  id: string;
  lat: number;
  lng: number;
  index: number;
};

export interface CourseMiniMapProps {
  /** 번호는 호출부가 매긴다 — 좌표 없는 아이템도 그대로 넘기면 여기서 걸러낸다 */
  points: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
    index: number;
  }>;
  /** 코스의 첫 Topic 색. 없으면 중립색 */
  pinColor: string;
  /** 핀 숫자 색 — 같은 Topic 의 textColorHex */
  pinTextColor: string;
  height?: number | string;
  className?: string;
}

// ─── 번호 핀 ──────────────────────────────────────────────────────────────────

function NumberPin({ index, fill, textColor }: { index: number; fill: string; textColor: string }) {
  const label = String(index);
  const fontSize = label.length > 1 ? 8 : 10;
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
      <ellipse cx="14" cy="35" rx="5" ry="1.8" fill="black" opacity={0.18} />
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 21.5 14 36 14 36C14 36 28 21.5 28 14C28 6.268 21.732 0 14 0Z"
        fill={fill}
        filter="url(#coursemap-pin-shadow)"
      />
      <defs>
        <filter id="coursemap-pin-shadow" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="black" floodOpacity="0.28" />
        </filter>
      </defs>
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        fill={textColor}
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </svg>
  );
}

// ─── 내부 컨텐츠 (Map 컨텍스트 필요) ─────────────────────────────────────────

function MapContent({
  coordPoints,
  pinColor,
  pinTextColor,
}: {
  coordPoints: CoordPoint[];
  pinColor: string;
  pinTextColor: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || coordPoints.length <= 1) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      coordPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 24);
    } catch {
      // google.maps 미로드 시 무시
    }
  // coordPoints는 매 렌더 새 배열이라 deps에 넣으면 렌더마다 fitBounds가 다시 돈다.
  // 원본(EventLocationMap:78)과 동일하게 최초 1회만 맞춘다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return (
    <>
      {coordPoints.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }}>
          <NumberPin index={p.index} fill={pinColor} textColor={pinTextColor} />
        </AdvancedMarker>
      ))}
    </>
  );
}

// ─── 공개 컴포넌트 ────────────────────────────────────────────────────────────

export function CourseMiniMap({
  points,
  pinColor,
  pinTextColor,
  height = 172,
  className,
}: CourseMiniMapProps) {
  const coordPoints: CoordPoint[] = points
    .map((p) =>
      p.latitude != null && p.longitude != null
        ? { id: p.id, lat: p.latitude, lng: p.longitude, index: p.index }
        : null,
    )
    .filter((p): p is CoordPoint => p !== null);

  // 좌표가 하나도 없으면 지도를 아예 그리지 않는다 — 자리표시는 호출부가 정한다
  if (coordPoints.length === 0 || !API_KEY) return null;

  const first = coordPoints[0];
  const isSingle = coordPoints.length === 1;

  return (
    <div style={{ height }} className={`w-full overflow-hidden ${className ?? ""}`}>
      <APIProvider apiKey={API_KEY} language="en">
        <Map
          {...(isSingle
            ? { center: { lat: first.lat, lng: first.lng }, zoom: 16 }
            : { defaultCenter: { lat: first.lat, lng: first.lng }, defaultZoom: 11 })}
          mapId={MAP_ID}
          gestureHandling="cooperative"
          disableDefaultUI
          className="w-full h-full"
        >
          <MapContent coordPoints={coordPoints} pinColor={pinColor} pinTextColor={pinTextColor} />
        </Map>
      </APIProvider>
    </div>
  );
}
