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
  focusedPlaceId?: string | null;
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
  focusedPlaceId,
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
      map.fitBounds(bounds, { top: 80, right: 60, bottom: sheetPeekH + 80, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  useEffect(() => {
    if (!map) return;
    const activeId = selectedPlaceId ?? focusedPlaceId;
    if (!activeId) return;
    const place = places.find((p) => p.id === activeId);
    if (!place) return;
    const FOCUS_ZOOM = 12; // 카드 탭 시 도시 레벨 고정 (조정 예정)
    const isFocusMove = !selectedPlaceId && !!focusedPlaceId;
    if (isFocusMove) map.setZoom(FOCUS_ZOOM);
    map.panTo({ lat: place.latitude, lng: place.longitude });
    const offsetY = Math.round((window.innerHeight - bottomOffset) * 0.12);
    map.panBy(0, offsetY);
  }, [map, selectedPlaceId, focusedPlaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const isSelected = selectedPlaceId === place.id || focusedPlaceId === place.id;
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

export function InteractiveMap({ places, selectedPlaceId, focusedPlaceId, highlightedIds, boundsKey, onMarkerClick, onMapClick, className, bottomOffset = 64 }: Props) {
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
          focusedPlaceId={focusedPlaceId}
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
