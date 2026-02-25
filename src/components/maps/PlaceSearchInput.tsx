"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X, ExternalLink } from "lucide-react";
import {
  APIProvider,
  useMapsLibrary,
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type PlaceSelectResult = {
  name: string;
  address: string;
  nameEn: string;
  addressEn: string;
  phone: string;
  operatingHours: string[];
  googleMapsUrl: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
};

export interface PlaceSearchInputProps {
  onSelect: (place: PlaceSelectResult) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

// ─── 내부 컴포넌트 (APIProvider 컨텍스트 필요) ───────────────────────────────

function PlaceSearchInputContent({
  onSelect,
  defaultValue = "",
  placeholder = "장소를 검색하세요...",
  className,
}: PlaceSearchInputProps) {
  const placesLib = useMapsLibrary("places");

  const [query, setQuery] = useState(defaultValue);
  const [searchResults, setSearchResults] = useState<
    google.maps.places.Place[]
  >([]);
  const [isPending, setIsPending] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── 텍스트 검색 (Places API New - searchByText) ──────────────────────────
  const doSearch = useCallback(
    async (input: string) => {
      if (!placesLib || !input.trim()) {
        setSearchResults([]);
        setPreviewIndex(null);
        return;
      }
      setIsPending(true);
      try {
        const { places } = await (
          google.maps.places.Place as any
        ).searchByText({
          textQuery: input,
          fields: [
            "displayName",
            "formattedAddress",
            "location",
            "id",
            "nationalPhoneNumber",
          ],
          maxResultCount: 20,
        });
        setSearchResults(places ?? []);
        setPreviewIndex(places?.length > 0 ? 0 : null);
      } catch {
        setSearchResults([]);
        setPreviewIndex(null);
      } finally {
        setIsPending(false);
      }
    },
    [placesLib],
  );

  // 검색어 디바운스 (600ms)
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 600);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // ── 최종 선택 확인 ──────────────────────────────────────────────────────
  const handleConfirm = async (place: google.maps.places.Place) => {
    const p = place as any;
    const fallbackName = p.displayName ?? "";

    setQuery(fallbackName);
    setSearchResults([]);
    setPreviewIndex(null);
    setIsConfirming(true);

    try {
      const lat = p.location?.lat();
      const lng = p.location?.lng();
      const placeId = p.id;
      const phone = p.nationalPhoneNumber ?? "";

      let nameEn = "";
      let addressEn = "";
      let operatingHours: string[] = [];

      try {
        const fields = "displayName,formattedAddress,regularOpeningHours";
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&languageCode=en&key=${API_KEY}`,
        );
        if (res.ok) {
          const data = await res.json();
          nameEn = data.displayName?.text ?? "";
          addressEn = data.formattedAddress ?? "";
          operatingHours = data.regularOpeningHours?.weekdayDescriptions ?? [];
        }
      } catch {
        // 영어 정보 취득 실패 시 빈값 유지
      }

      onSelect({
        name: fallbackName,
        address: p.formattedAddress ?? "",
        nameEn,
        addressEn,
        phone,
        operatingHours,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        lat,
        lng,
        googlePlaceId: placeId,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSearchResults([]);
        setPreviewIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearInput = () => {
    setQuery("");
    setSearchResults([]);
    setPreviewIndex(null);
  };

  const previewPlace =
    previewIndex !== null ? (searchResults[previewIndex] as any) : null;
  const previewLat = previewPlace?.location?.lat();
  const previewLng = previewPlace?.location?.lng();

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* 입력창 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
          {isPending || isConfirming ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={clearInput}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 2-패널 드롭다운 */}
      {searchResults.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-background border rounded-lg shadow-lg flex overflow-hidden w-[640px]">
          {/* 왼쪽: 결과 목록 */}
          <ul className="w-2/5 border-r overflow-y-auto max-h-[360px] shrink-0">
            {searchResults.map((result, i) => {
              const r = result as any;
              const isSelected = previewIndex === i;
              return (
                <li key={r.id ?? i}>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(i)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b last:border-b-0 transition-colors ${
                      isSelected ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.displayName}
                      </div>
                      {r.formattedAddress && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {r.formattedAddress}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 오른쪽: 미리보기 */}
          <div className="flex-1 flex flex-col min-w-0">
            {previewPlace &&
            previewLat !== undefined &&
            previewLng !== undefined ? (
              <>
                {/* 지도 */}
                <div className="h-40 shrink-0">
                  <Map
                    key={`${previewLat}-${previewLng}`}
                    center={{ lat: previewLat, lng: previewLng }}
                    zoom={15}
                    mapId={MAP_ID}
                    gestureHandling="none"
                    disableDefaultUI
                  >
                    <AdvancedMarker
                      position={{ lat: previewLat, lng: previewLng }}
                    />
                  </Map>
                </div>

                {/* 정보 */}
                <div className="p-3 space-y-1 border-t flex-1">
                  <p className="text-sm font-semibold leading-snug">
                    {previewPlace.displayName}
                  </p>
                  {previewPlace.formattedAddress && (
                    <p className="text-xs text-muted-foreground">
                      {previewPlace.formattedAddress}
                    </p>
                  )}
                  {previewPlace.nationalPhoneNumber && (
                    <p className="text-xs text-muted-foreground">
                      {previewPlace.nationalPhoneNumber}
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${previewPlace.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-0.5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Google Maps에서 보기
                  </a>
                </div>

                {/* 선택 버튼 */}
                <div className="p-3 border-t">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => handleConfirm(searchResults[previewIndex!])}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      "이 장소로 선택"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
                결과 목록에서 장소를 선택하면
                <br />
                미리보기가 표시됩니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 공개 컴포넌트 (APIProvider 포함, 단독 사용 가능) ─────────────────────────

export function PlaceSearchInput(props: PlaceSearchInputProps) {
  if (!API_KEY) {
    return (
      <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
        Google Maps API 키가 설정되지 않았습니다.
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <PlaceSearchInputContent {...props} />
    </APIProvider>
  );
}
