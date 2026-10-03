"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { PlaceMarker } from "./PlaceMarker";
import type { MarkerGradient } from "@/lib/map-utils";
import { BOTTOM_NAV_SPACE, isRailLayout } from "@/lib/bottom-nav";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
const TARGET_ZOOM = 15;
/** 다른 화면에서 장소를 지정해 들어왔을 때(?place=) 처음 보여줄 줌 — 골목과 주변 동네가 같이 보인다 */
const ENTRY_ZOOM = 16;

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
  fitMarkers: (coords: { lat: number; lng: number }[]) => void;
};

interface Props {
  places: MarkerPlace[];
  selectedPlaceId: string | null;
  focusedPlaceIds?: Set<string>;
  highlightedIds?: Set<string>;
  boundsKey?: string;
  /**
   * 지역 필터가 바뀌었다는 신호. 값이 바뀌면 지금 보이는 마커로 카메라를 맞춘다.
   *
   * boundsKey 와 나눈 이유는 해제 때문이다. boundsKey 는 "보여줄 것이 바뀌었다" 는
   * 신호라 지역을 벗는 것도 신호로 읽어 전국으로 튄다 — 보던 동네가 화면에서 사라진다.
   * 이 키는 지역이 있을 때만 값을 갖고, 벗으면 비어서 카메라가 그대로 있는다.
   */
  regionKey?: string | null;
  /**
   * 처음 열릴 때 이 장소로 카메라를 맞춘다 (게시글 → View on Map 처럼 장소를 지정해 들어온 경우).
   * 첫 한 번만 쓴다 — 그 뒤 boundsKey 가 바뀌면(필터 등) 지금처럼 전체 마커에 맞춘다. 없으면 동작이 그대로다
   */
  initialFocusPlaceId?: string | null;
  onMarkerClick: (placeId: string) => void;
  onMapClick?: () => void;
  className?: string;
  bottomOffset?: number;
  userLocation?: { lat: number; lng: number } | null;
}

function MapContent({
  places,
  selectedPlaceId,
  focusedPlaceIds,
  highlightedIds,
  boundsKey,
  regionKey,
  initialFocusPlaceId,
  onMarkerClick,
  onMapClick,
  bottomOffset = BOTTOM_NAV_SPACE,
  userLocation,
  cameraRef,
}: Omit<Props, "className"> & { cameraRef: React.Ref<FocusCameraHandle> }) {
  const map = useMap();

  // 카메라가 비켜 줄 영역. 모바일은 아래 시트가 지도의 40% 를 덮는다고 보고 그만큼 비우고
  // 초점을 12% 아래로 내린다. lg 는 시트가 지도 옆 패널이라 지도 위에 덮이는 것이 없다.
  //
  // focusOffsetY 는 마커 하나를 골랐을 때만 쓴다. lg 는 고른 장소의 카드가 지도 아래 40% 까지 뜨므로
  // 마커를 지도 높이의 10% 만큼 위로 올려 카드 위 영역에 둔다. 모바일은 offsetY 와 같다.
  const cameraInsets = useCallback(() => {
    if (isRailLayout()) {
      return { sheetPeekH: 0, offsetY: 0, focusOffsetY: Math.round(window.innerHeight * 0.1) };
    }
    const containerH = window.innerHeight - bottomOffset;
    const offsetY = Math.round(containerH * 0.12);
    return {
      sheetPeekH: Math.round(containerH * 0.4),
      offsetY,
      focusOffsetY: offsetY,
    };
  }, [bottomOffset]);

  const fitAllMarkers = useCallback(() => {
    if (!map || places.length === 0) return;
    const { sheetPeekH, offsetY } = cameraInsets();
    if (places.length === 1) {
      map.panTo({ lat: places[0].latitude, lng: places[0].longitude });
      map.setZoom(13);
      map.panBy(0, offsetY);
      return;
    }
    try {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, { top: 100, right: 60, bottom: sheetPeekH + 80, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  }, [map, places, cameraInsets]);

  const fitMarkers = useCallback((coords: { lat: number; lng: number }[]) => {
    if (!map || coords.length === 0) return;
    const { sheetPeekH, offsetY } = cameraInsets();
    if (coords.length === 1) {
      map.moveCamera({ center: coords[0], zoom: TARGET_ZOOM });
      map.panBy(0, offsetY);
      return;
    }
    try {
      const bounds = new google.maps.LatLngBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { top: 100, right: 60, bottom: sheetPeekH + 80, left: 60 });
    } catch {
      // google.maps 미로드 시 무시
    }
  }, [map, cameraInsets]);

  useImperativeHandle(cameraRef, () => ({
    focusCamera({ lat, lng }) {
      if (!map) return;
      const { focusOffsetY: offsetY } = cameraInsets();
      const current = map.getZoom();
      const zoom = current == null || current < TARGET_ZOOM ? TARGET_ZOOM : current;
      map.moveCamera({ center: { lat, lng }, zoom });
      map.panBy(0, offsetY);
    },
    fitAllMarkers,
    fitMarkers,
  }), [map, cameraInsets, fitAllMarkers, fitMarkers]);

  // 장소를 지정해 들어왔을 때 첫 카메라. 모바일은 아래 장소 카드가 지도의 아래 절반 가까이를 덮으므로
  // 핀을 카드 위 빈 곳(위에서 약 30%)에 두도록 지도 높이의 20% 만큼 올린다. lg 는 카드가 지도 아래 40% 라 focusOffsetY 를 그대로 쓴다
  const initialFocusDone = useRef(false);
  const focusOnEntry = useCallback((coords: { lat: number; lng: number }) => {
    if (!map) return;
    const offsetY = isRailLayout()
      ? cameraInsets().focusOffsetY
      : Math.round((window.innerHeight - bottomOffset) * 0.2);
    // 첫 진입에는 지도가 아직 크기를 잡기 전이라 panBy 가 먹지 않는다. 그래서 옮길 픽셀을 위도로 바꿔
    // 가운데 자체를 장소보다 남쪽에 둔다 (메르카토르, 256px 타일). 그러면 핀이 그만큼 위에 보인다
    const degPerPx = (360 / (256 * 2 ** ENTRY_ZOOM)) * Math.cos((coords.lat * Math.PI) / 180);
    map.moveCamera({ center: { lat: coords.lat - offsetY * degPerPx, lng: coords.lng }, zoom: ENTRY_ZOOM });
  }, [map, cameraInsets, bottomOffset]);

  // 초기 bounds — boundsKey 변경 시 전체 마커가 보이도록 맞춤.
  // 단 장소를 지정해 들어온 첫 번에는 그 장소로 맞춘다 (map 이 붙은 뒤 한 번)
  useEffect(() => {
    if (!boundsKey) return;
    if (map && initialFocusPlaceId && !initialFocusDone.current) {
      initialFocusDone.current = true;
      const target = places.find((p) => p.id === initialFocusPlaceId);
      if (target) {
        focusOnEntry({ lat: target.latitude, lng: target.longitude });
        return;
      }
    }
    fitAllMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  // 지역 필터 변경 시 그 지역의 마커로 맞춤. 해제(빈 값)면 카메라를 그대로 둔다.
  // map 을 의존에 두는 것은 boundsKey 와 같은 이유다 — 첫 진입에서 URL 로 지역이
  // 들어오면 이 effect 가 지도보다 먼저 돈다. map 이 붙을 때 한 번 더 돌아야 맞춰진다.
  useEffect(() => {
    if (!regionKey) return;
    fitAllMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, regionKey]);

  // 카드 탭(focusedPlaceIds) 시 해당 장소들로 카메라 이동
  // 마커 탭 카메라는 handleMarkerClick에서 focusCamera()로 직접 처리 (effect 경유 없음)
  useEffect(() => {
    if (!map || !focusedPlaceIds || focusedPlaceIds.size === 0) return;

    const coords = places
      .filter((p) => focusedPlaceIds.has(p.id))
      .map((p) => ({ lat: p.latitude, lng: p.longitude }));

    if (coords.length === 0) return;

    const { sheetPeekH, offsetY } = cameraInsets();

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
      {userLocation && (
        <AdvancedMarker
          position={userLocation}
          zIndex={20}
          anchorLeft="-50%"
          anchorTop="-50%"
        >
          <div className="relative">
            {/* 헤일로 */}
            <div className="absolute -inset-2 rounded-full bg-blue-500/20" />
            {/* 코어 dot */}
            <div className="relative w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-md" />
          </div>
        </AdvancedMarker>
      )}
      {places.map((place) => {
        const isSelected = selectedPlaceId === place.id || (focusedPlaceIds?.has(place.id) ?? false);
        const isHighlighted = highlightedIds?.has(place.id) ?? false;
        const color = place.markerColor ?? "#D3FD52";
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
  { places, selectedPlaceId, focusedPlaceIds, highlightedIds, boundsKey, regionKey, initialFocusPlaceId, onMarkerClick, onMapClick, className, bottomOffset = BOTTOM_NAV_SPACE, userLocation },
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
          regionKey={regionKey}
          initialFocusPlaceId={initialFocusPlaceId}
          onMarkerClick={onMarkerClick}
          onMapClick={onMapClick}
          bottomOffset={bottomOffset}
          userLocation={userLocation}
          cameraRef={ref}
        />
      </APIProvider>
    </div>
  );
});
