"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, MapPin, Search, X } from "lucide-react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
  useMap,
} from "@vis.gl/react-google-maps";
import { createPlaceFromGoogleMaps } from "@/app/(user)/_actions/recreeshot-actions";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// 서울 기본 중심
const DEFAULT_CENTER = { lat: 37.5326, lng: 127.024612 };
const DEFAULT_ZOOM = 13;

interface PlaceResult {
  id: string;
  nameKo: string | null;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
}

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
  onClose: () => void;
}

export function AddPlaceOverlay({ onSelect, onClose }: Props) {
  if (!API_KEY) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <APIProvider apiKey={API_KEY} language="en">
        <AddPlaceContent onSelect={onSelect} onClose={onClose} />
      </APIProvider>
    </div>
  );
}

function AddPlaceContent({ onSelect, onClose }: Props) {
  const placesLib = useMapsLibrary("places");
  const map = useMap();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingPlace, setIsFetchingPlace] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 검색 디바운스
  const doSearch = useCallback(
    async (input: string) => {
      if (!placesLib || !input.trim()) { setSuggestions([]); return; }
      setIsSearching(true);
      try {
        const { places } = await (google.maps.places.Place as any).searchByText({
          textQuery: input,
          fields: ["displayName", "formattedAddress", "location", "id"],
          maxResultCount: 8,
          language: "en",
        });
        setSuggestions(places ?? []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib],
  );

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 500);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  // 검색 결과에서 선택
  function selectFromList(r: any) {
    const lat = r.location?.lat();
    const lng = r.location?.lng();
    if (lat == null || lng == null) return;

    setSelected({ placeId: r.id, name: r.displayName ?? "", address: r.formattedAddress ?? "", lat, lng });
    setQuery(r.displayName ?? "");
    setShowSuggestions(false);

    map?.panTo({ lat, lng });
    map?.setZoom(16);
  }

  // 지도 POI 클릭
  async function handleMapClick(e: any) {
    const placeId: string | undefined = e.detail?.placeId;
    if (!placeId || !placesLib) return;

    // 기본 인포윈도우 방지
    e.stop?.();

    setIsFetchingPlace(true);
    try {
      const place = new google.maps.places.Place({ id: placeId, requestedLanguage: "en" } as any);
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
      const p = place as any;
      const lat = p.location?.lat();
      const lng = p.location?.lng();
      if (lat == null || lng == null) return;

      setSelected({ placeId, name: p.displayName ?? "", address: p.formattedAddress ?? "", lat, lng });
      setShowSuggestions(false);
      map?.panTo({ lat, lng });
    } catch {
      // POI가 아닌 곳 클릭 시 무시
    } finally {
      setIsFetchingPlace(false);
    }
  }

  // DB 저장 후 선택
  async function handleAdd() {
    if (!selected) return;
    setIsSaving(true);
    try {
      let nameEn = "";
      let addressEn = "";
      try {
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${selected.placeId}?fields=displayName,formattedAddress&languageCode=en&key=${API_KEY}`
        );
        if (res.ok) {
          const data = await res.json();
          nameEn = data.displayName?.text ?? "";
          addressEn = data.formattedAddress ?? "";
        }
      } catch { /* 영어 정보 없어도 진행 */ }

      const result = await createPlaceFromGoogleMaps({
        nameKo: selected.name,
        nameEn: nameEn || selected.name,
        addressKo: selected.address,
        addressEn,
        lat: selected.lat,
        lng: selected.lng,
        googlePlaceId: selected.placeId,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${selected.placeId}`,
      });

      if ("error" in result) { alert(result.error); return; }
      onSelect(result);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/* 헤더 */}
      <header className="app-header shrink-0">
        <div className="relative h-12 flex items-center px-2">
          <button type="button" onClick={onClose} className="flex items-center justify-center size-8">
            <ChevronLeft className="size-5" />
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-tight">
            Add Location
          </span>
        </div>
      </header>

      {/* 지도 + 오버레이 영역 */}
      <div className="relative flex-1">

        {/* 지도 */}
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
        >
          {selected && (
            <AdvancedMarker position={{ lat: selected.lat, lng: selected.lng }} />
          )}
        </Map>

        {/* POI 로딩 인디케이터 */}
        {isFetchingPlace && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-md">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}

        {/* 검색바 (지도 위 오버레이) */}
        <div className="absolute top-3 left-3 right-3 z-10">
          <div className="flex items-center gap-2 bg-background shadow-lg rounded-2xl px-3.5 py-2.5">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in English (e.g. Cafe BTS)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {isSearching && <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />}
            {!isSearching && query && (
              <button type="button" onClick={() => { setQuery(""); setSuggestions([]); setShowSuggestions(false); }}>
                <X className="size-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-1.5 bg-background rounded-2xl shadow-lg overflow-hidden">
              {suggestions.map((r, i) => {
                const item = r as any;
                return (
                  <button
                    key={item.id ?? i}
                    type="button"
                    onClick={() => selectFromList(item)}
                    className="flex items-start gap-3 w-full text-left px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 last:border-0"
                  >
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{item.displayName}</p>
                      {item.formattedAddress && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.formattedAddress}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 힌트 (아무것도 선택 안 됐을 때) */}
        {!selected && !showSuggestions && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
              <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Search or tap a place on the map
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 선택된 장소 하단 카드 */}
      {selected && (
        <div className="shrink-0 bg-background shadow-[0_-6px_24px_rgba(0,0,0,0.18)] px-4 pt-4 pb-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center">
              <MapPin className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{selected.name}</p>
              {selected.address && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selected.address}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex-shrink-0 text-muted-foreground p-1"
            >
              <X className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSaving}
            className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Adding..." : "Add this place"}
          </button>
        </div>
      )}
    </>
  );
}
