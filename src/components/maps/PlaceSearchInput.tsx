"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type PlaceSelectResult = {
  name: string;
  address: string;
  nameEn: string;
  addressEn: string;
  phone: string;
  operatingHours: string[]; // 영어 요일별 영업시간 설명
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
  // Places API (New) 라이브러리 로드 — null이면 아직 로딩 중
  const placesLib = useMapsLibrary("places");

  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── 자동완성 예측 요청 (Places API New) ──────────────────────────────────
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!placesLib || !input.trim()) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }
      setIsPending(true);
      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            { input },
          );
        const preds = suggestions
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p !== null);
        setPredictions(preds);
        setIsOpen(preds.length > 0);
      } catch {
        setPredictions([]);
        setIsOpen(false);
      } finally {
        setIsPending(false);
      }
    },
    [placesLib],
  );

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => fetchPredictions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchPredictions]);

  // ── 항목 선택 → Place.fetchFields로 lat/lng 조회 ─────────────────────────
  const handleSelect = async (prediction: google.maps.places.PlacePrediction) => {
    const fallbackName = prediction.mainText?.text ?? prediction.text.text;
    setQuery(fallbackName);
    setIsOpen(false);
    setPredictions([]);

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "id"],
      });

      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (lat === undefined || lng === undefined) return;

      // 영어 이름/주소/전화번호/영업시간을 Places REST API로 별도 요청
      let nameEn = "";
      let addressEn = "";
      let phone = "";
      let operatingHours: string[] = [];
      try {
        const fields = [
          "displayName",
          "formattedAddress",
          "nationalPhoneNumber",
          "regularOpeningHours",
        ].join(",");
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${prediction.placeId}?fields=${fields}&languageCode=en&key=${API_KEY}`,
        );
        if (res.ok) {
          const data = await res.json();
          nameEn = data.displayName?.text ?? "";
          addressEn = data.formattedAddress ?? "";
          phone = data.nationalPhoneNumber ?? "";
          operatingHours = data.regularOpeningHours?.weekdayDescriptions ?? [];
        }
      } catch {
        // 영어 정보 취득 실패 시 빈값 유지
      }

      const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${prediction.placeId}`;

      onSelect({
        name: place.displayName ?? fallbackName,
        address: place.formattedAddress ?? prediction.text.text,
        nameEn,
        addressEn,
        phone,
        operatingHours,
        googleMapsUrl,
        lat,
        lng,
        googlePlaceId: prediction.placeId,
      });
    } catch {
      // fetchFields 실패 시 무시
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearInput = () => {
    setQuery("");
    setPredictions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* 입력창 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
          {isPending ? (
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

      {/* 자동완성 드롭다운 */}
      {isOpen && predictions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 hover:bg-muted flex items-start gap-3 border-b last:border-b-0 transition-colors"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.mainText?.text ?? p.text.text}
                  </div>
                  {p.secondaryText && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p.secondaryText.text}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
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
