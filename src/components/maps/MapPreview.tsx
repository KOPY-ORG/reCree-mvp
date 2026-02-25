"use client";

import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Google Maps의 AdvancedMarker는 mapId가 필요합니다.
 * 프로덕션에서는 Google Cloud Console에서 Map ID를 발급받아
 * NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID 환경변수에 설정하세요.
 * 개발·테스트 시에는 Google이 제공하는 "DEMO_MAP_ID"를 사용합니다.
 */
const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface MapPreviewProps {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number | string;
  className?: string;
}

// ─── 내부 컴포넌트 (APIProvider 컨텍스트 필요) ───────────────────────────────

function MapPreviewContent({ lat, lng, zoom = 15 }: Omit<MapPreviewProps, "height" | "className">) {
  return (
    <Map
      center={{ lat, lng }}
      zoom={zoom}
      mapId={MAP_ID}
      gestureHandling="none"
      disableDefaultUI
    >
      <AdvancedMarker position={{ lat, lng }} />
    </Map>
  );
}

// ─── 공개 컴포넌트 (APIProvider 포함, 단독 사용 가능) ─────────────────────────

export function MapPreview({
  lat,
  lng,
  zoom = 15,
  height = 300,
  className,
}: MapPreviewProps) {
  if (!API_KEY) {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center rounded-lg border bg-muted/50 text-sm text-muted-foreground ${className ?? ""}`}
      >
        지도를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className={`w-full overflow-hidden rounded-lg border ${className ?? ""}`}
    >
      <APIProvider apiKey={API_KEY}>
        <MapPreviewContent lat={lat} lng={lng} zoom={zoom} />
      </APIProvider>
    </div>
  );
}
