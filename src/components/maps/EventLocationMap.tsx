"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type CoordPlace = {
  id: string;
  lat: number;
  lng: number;
  index: number;
};

export interface EventLocationMapProps {
  places: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
    nameEn?: string | null;
  }>;
  height?: number | string;
  className?: string;
}

// ─── 번호 핀 SVG ─────────────────────────────────────────────────────────────

function NumberPin({ index }: { index: number }) {
  const label = String(index);
  const fontSize = label.length > 1 ? 8 : 10;
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
      <ellipse cx="14" cy="35" rx="5" ry="1.8" fill="black" opacity={0.18} />
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 21.5 14 36 14 36C14 36 28 21.5 28 14C28 6.268 21.732 0 14 0Z"
        fill="#E9283D"
        filter="url(#elmap-pin-shadow)"
      />
      <defs>
        <filter id="elmap-pin-shadow" x="-40%" y="-20%" width="180%" height="160%">
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
        fill="white"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </svg>
  );
}

// ─── 내부 컨텐츠 (Map 컨텍스트 필요) ─────────────────────────────────────────

function MapContent({ coordPlaces }: { coordPlaces: CoordPlace[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || coordPlaces.length <= 1) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      coordPlaces.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 24);
    } catch {
      // google.maps 미로드 시 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return (
    <>
      {coordPlaces.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }}>
          <NumberPin index={p.index} />
        </AdvancedMarker>
      ))}
    </>
  );
}

// ─── 공개 컴포넌트 ────────────────────────────────────────────────────────────

export function EventLocationMap({ places, height = 220, className }: EventLocationMapProps) {
  const coordPlaces: CoordPlace[] = places
    .map((p, i) =>
      p.latitude != null && p.longitude != null
        ? { id: p.id, lat: p.latitude, lng: p.longitude, index: i + 1 }
        : null,
    )
    .filter((p): p is CoordPlace => p !== null);

  if (coordPlaces.length === 0 || !API_KEY) return null;

  const first = coordPlaces[0];
  const isSingle = coordPlaces.length === 1;

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
          <MapContent coordPlaces={coordPlaces} />
        </Map>
      </APIProvider>
    </div>
  );
}
