"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

type MarkerPlace = {
  id: string;
  latitude: number;
  longitude: number;
  nameEn: string;
  markerColor?: string;
  markerGlyphColor?: string;
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

  useEffect(() => {
    if (!boundsKey || !map || places.length === 0) return;
    const containerH = window.innerHeight - 64;
    const sheetPeekH = Math.round(containerH * 0.4);
    if (places.length === 1) {
      map.panTo({ lat: places[0].latitude, lng: places[0].longitude });
      map.setZoom(14);
      map.panBy(0, Math.round(containerH * 0.2));
      return;
    }
    try {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, { top: 80, right: 60, bottom: sheetPeekH + 20, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  useEffect(() => {
    if (!map || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    map.panTo({ lat: place.latitude, lng: place.longitude });
    const offsetY = Math.round((window.innerHeight - 64) * 0.25);
    map.panBy(0, offsetY);
  }, [map, selectedPlaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
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
        const color = place.markerColor ?? "#C8FF09";
        const glyphColor = place.markerGlyphColor ?? "white";
        return (
          <AdvancedMarker
            key={place.id}
            position={{ lat: place.latitude, lng: place.longitude }}
            onClick={() => onMarkerClick(place.id)}
            title={place.nameEn}
            zIndex={isSelected ? 10 : isHighlighted ? 5 : 1}
          >
            <Pin
              background={color}
              borderColor= "white" //{isSelected ? glyphColor : color}
              glyphColor={glyphColor}
              scale={isSelected ? 1.3 : isHighlighted ? 1.1 : 1}
            />
          </AdvancedMarker>
        );
      })}
    </Map>
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
