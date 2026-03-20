"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

function PinMarker({ color, size }: { color: string; size: number }) {
  // 핀 비율: width = size * 0.7, height = size
  const w = Math.round(size * 0.7);
  const h = size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 28 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}
    >
      {/* 핀 몸통 */}
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill={color}
      />
      {/* 안쪽 흰 원 */}
      <circle cx="14" cy="14" r="5.5" fill="white" fillOpacity="0.85" />
    </svg>
  );
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

type MarkerPlace = {
  id: string;
  latitude: number;
  longitude: number;
  nameEn: string;
  markerColor?: string;
};

interface Props {
  places: MarkerPlace[];
  selectedPlaceId: string | null;
  highlightedIds?: Set<string>;
  boundsKey?: string;
  onMarkerClick: (placeId: string) => void;
  className?: string;
}

function MapContent({
  places,
  selectedPlaceId,
  highlightedIds,
  boundsKey,
  onMarkerClick,
}: Omit<Props, "className">) {
  const map = useMap();

  // boundsKey 변경 시 검색 결과 영역으로 포커스 (바텀 시트 peek 영역 제외)
  useEffect(() => {
    if (!boundsKey || !map || places.length === 0) return;
    // 바텀 시트 peek 상태: 지도 컨테이너 높이의 40%를 차지
    const containerH = window.innerHeight - 64; // 64 = 하단 내비
    const sheetPeekH = Math.round(containerH * 0.4);
    if (places.length === 1) {
      map.panTo({ lat: places[0].latitude, lng: places[0].longitude });
      map.setZoom(14);
      // 가시 영역(위 60%) 중앙에 마커가 오도록 위로 이동
      map.panBy(0, Math.round(containerH * 0.2));
      return;
    }
    try {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      // 바텀 시트 높이만큼 하단 패딩 추가 → 가시 영역 기준으로 fitBounds
      map.fitBounds(bounds, { top: 80, right: 60, bottom: sheetPeekH + 20, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  // 장소 선택 시 해당 마커를 바텀시트 위 중앙에 위치
  useEffect(() => {
    if (!map || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;

    map.panTo({ lat: place.latitude, lng: place.longitude });
    // half 시트 높이(~50%)의 절반만큼 아래로 이동 → 마커가 시트 위 영역 중앙에 보임
    const offsetY = Math.round((window.innerHeight - 64) * 0.25);
    map.panBy(0, offsetY);
  }, [map, selectedPlaceId]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <>
      <Map
        defaultCenter={{ lat: 37.5665, lng: 126.978 }}
        defaultZoom={11}
        mapId={MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
      >
        {places.map((place) => {
          const isSelected = selectedPlaceId === place.id;
          const isHighlighted = highlightedIds?.has(place.id) ?? false;
          const pinColor = place.markerColor ?? "#1a1a1a";
          return (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.latitude, lng: place.longitude }}
              onClick={() => onMarkerClick(place.id)}
              title={place.nameEn}
              zIndex={isSelected ? 10 : isHighlighted ? 5 : 1}
            >
              {isSelected ? (
                <div className="flex flex-col items-center">
                  <div className="px-2.5 py-1 bg-foreground text-background text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap max-w-[140px] truncate">
                    {place.nameEn}
                  </div>
                  <div
                    className="w-0 h-0 -mt-px"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "6px solid hsl(var(--foreground))",
                    }}
                  />
                  <PinMarker color={pinColor} size={34} />
                </div>
              ) : (
                <PinMarker color={pinColor} size={isHighlighted ? 32 : 28} />
              )}
            </AdvancedMarker>
          );
        })}
      </Map>


    </>
  );
}

export function InteractiveMap({ places, selectedPlaceId, highlightedIds, boundsKey, onMarkerClick, className }: Props) {
  if (!API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 text-sm text-muted-foreground ${className ?? ""}`}>
        지도를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <APIProvider apiKey={API_KEY} language="en">
        <MapContent
          places={places}
          selectedPlaceId={selectedPlaceId}
          highlightedIds={highlightedIds}
          boundsKey={boundsKey}
          onMarkerClick={onMarkerClick}
        />
      </APIProvider>
    </div>
  );
}
