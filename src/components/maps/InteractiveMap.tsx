"use client";

import { useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { PlaceMarker } from "./PlaceMarker";
import type { MarkerGradient } from "@/lib/map-utils";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
const TARGET_ZOOM = 15;

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
  showLabel?: boolean;
  invertOnSelect?: boolean;
};

export type FocusCameraHandle = {
  focusCamera: (coords: { lat: number; lng: number }) => void;
  fitAllMarkers: () => void;
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
  cameraRef,
}: Omit<Props, "className"> & { cameraRef: React.Ref<FocusCameraHandle> }) {
  const map = useMap();

  const fitAllMarkers = useCallback(() => {
    if (!map || places.length === 0) return;
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
  }, [map, places, bottomOffset]);

  useImperativeHandle(cameraRef, () => ({
    focusCamera({ lat, lng }) {
      if (!map) return;
      const containerH = window.innerHeight - bottomOffset;
      const offsetY = Math.round(containerH * 0.12);
      const current = map.getZoom();
      const zoom = current == null || current < TARGET_ZOOM ? TARGET_ZOOM : current;
      map.moveCamera({ center: { lat, lng }, zoom });
      map.panBy(0, offsetY);
    },
    fitAllMarkers,
  }), [map, bottomOffset, fitAllMarkers]);

  // 초기 bounds — boundsKey 변경 시 전체 마커가 보이도록 맞춤
  useEffect(() => {
    if (!boundsKey) return;
    fitAllMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  // 카드 탭(focusedPlaceIds) 시 해당 장소들로 카메라 이동
  // 마커 탭 카메라는 handleMarkerClick에서 focusCamera()로 직접 처리 (effect 경유 없음)
  useEffect(() => {
    if (!map || !focusedPlaceIds || focusedPlaceIds.size === 0) return;

    const coords = places
      .filter((p) => focusedPlaceIds.has(p.id))
      .map((p) => ({ lat: p.latitude, lng: p.longitude }));

    if (coords.length === 0) return;

    const containerH = window.innerHeight - bottomOffset;
    const sheetPeekH = Math.round(containerH * 0.4);
    const offsetY = Math.round(containerH * 0.12);

    if (coords.length === 1) {
      const current = map.getZoom();
      const zoom = current == null || current < TARGET_ZOOM ? TARGET_ZOOM : current;
      map.moveCamera({ center: coords[0], zoom });
      map.panBy(0, offsetY);
    } else {
      try {
        const bounds = new google.maps.LatLngBounds();
        coords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { top: 160, right: 100, bottom: sheetPeekH + 80, left: 100 });
      } catch {
        // google.maps 미로드 시 무시
      }
    }
  }, [map, focusedPlaceIds]); // eslint-disable-line react-hooks/exhaustive-deps

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
              showLabel={place.showLabel}
              invertOnSelect={place.invertOnSelect}
            />
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

export const InteractiveMap = forwardRef<FocusCameraHandle, Props>(function InteractiveMap(
  { places, selectedPlaceId, focusedPlaceIds, highlightedIds, boundsKey, onMarkerClick, onMapClick, className, bottomOffset = 64 },
  ref
) {
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
          cameraRef={ref}
        />
      </APIProvider>
    </div>
  );
});
