"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { PlaceMarker } from "./PlaceMarker";
import type { MarkerGradient } from "@/lib/map-utils";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

type MarkerPlace = {
  id: string;
  latitude: number;
  longitude: number;
  nameEn: string;
  markerColor?: string;
  markerGlyphColor?: string;
  markerGradient?: MarkerGradient;
  isSaved?: boolean;
  posts?: { id: string }[];
  postCount?: number; // posts.length 대신 명시적 카운트 오버라이드
};

interface Props {
  places: MarkerPlace[];
  selectedPlaceId: string | null;
  focusedPlaceIds?: Set<string>;
  highlightedIds?: Set<string>;
  boundsKey?: string;
  onMarkerClick: (placeId: string) => void;
  onMapClick?: () => void;
  className?: string;
  bottomOffset?: number;
}

function MapContent({
  places,
  selectedPlaceId,
  focusedPlaceIds,
  highlightedIds,
  boundsKey,
  onMarkerClick,
  onMapClick,
  bottomOffset = 64,
}: Omit<Props, "className">) {
  const map = useMap();

  useEffect(() => {
    if (!boundsKey || !map || places.length === 0) return;
    const containerH = window.innerHeight - bottomOffset;
    const sheetPeekH = Math.round(containerH * 0.4);
    if (places.length === 1) {
      map.panTo({ lat: places[0].latitude, lng: places[0].longitude });
      map.setZoom(13);
      map.panBy(0, Math.round(containerH * 0.12));
      return;
    }
    try {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, { top: 100, right: 60, bottom: sheetPeekH + 80, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  useEffect(() => {
    if (!map) return;

    // 활성 좌표 목록 결정 — focusedPlaceIds(복수) 우선, 없으면 selectedPlaceId(단일)
    let coords: { lat: number; lng: number }[];
    if (focusedPlaceIds && focusedPlaceIds.size > 0) {
      coords = places
        .filter((p) => focusedPlaceIds.has(p.id))
        .map((p) => ({ lat: p.latitude, lng: p.longitude }));
    } else if (selectedPlaceId) {
      const p = places.find((place) => place.id === selectedPlaceId);
      coords = p ? [{ lat: p.latitude, lng: p.longitude }] : [];
    } else {
      return;
    }

    if (coords.length === 0) return;

    const containerH = window.innerHeight - bottomOffset;
    const sheetPeekH = Math.round(containerH * 0.4);
    const offsetY = Math.round(containerH * 0.12);

    if (coords.length === 1) {
      // 단일: panTo만 — fitBounds 쓰면 줌이 최대로 튄다
      map.panTo(coords[0]);
      map.panBy(0, offsetY);
    } else {
      // 복수: fitBounds — bottom에 시트 peek 높이 padding 포함
      try {
        const bounds = new google.maps.LatLngBounds();
        coords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { top: 160, right: 100, bottom: sheetPeekH + 80, left: 100 });
      } catch {
        // google.maps 미로드 시 무시
      }
    }
  }, [map, selectedPlaceId, focusedPlaceIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Map
      defaultCenter={{ lat: 37.5665, lng: 126.978 }}
      defaultZoom={11}
      mapId={MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI
      className="w-full h-full"
      onClick={() => onMapClick?.()}
    >
      {places.map((place) => {
        const isSelected = selectedPlaceId === place.id || (focusedPlaceIds?.has(place.id) ?? false);
        const isHighlighted = highlightedIds?.has(place.id) ?? false;
        const color = place.markerColor ?? "#C8FF09";
        return (
          <AdvancedMarker
            key={place.id}
            position={{ lat: place.latitude, lng: place.longitude }}
            onClick={() => onMarkerClick(place.id)}
            title={place.nameEn}
            zIndex={isSelected ? 10 : isHighlighted ? 5 : 1}
          >
            <PlaceMarker
              color={color}
              isSelected={isSelected}
              isSaved={place.isSaved ?? false}
              nameEn={place.nameEn}
              postCount={place.postCount ?? place.posts?.length ?? 0}
              placeId={place.id}
              gradient={place.markerGradient}
            />
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

export function InteractiveMap({ places, selectedPlaceId, focusedPlaceIds, highlightedIds, boundsKey, onMarkerClick, onMapClick, className, bottomOffset = 64 }: Props) {
  if (!API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 text-sm text-muted-foreground ${className ?? ""}`}>
        Cannot load map.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <APIProvider apiKey={API_KEY} language="en">
        <MapContent
          places={places}
          selectedPlaceId={selectedPlaceId}
          focusedPlaceIds={focusedPlaceIds}
          highlightedIds={highlightedIds}
          boundsKey={boundsKey}
          onMarkerClick={onMarkerClick}
          onMapClick={onMapClick}
          bottomOffset={bottomOffset}
        />
      </APIProvider>
    </div>
  );
}
