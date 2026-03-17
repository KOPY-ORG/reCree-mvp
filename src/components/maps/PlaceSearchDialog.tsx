"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  APIProvider,
  useMapsLibrary,
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import type { PlaceStatus } from "@prisma/client";
import { Romanize } from "hangul-romanize";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveCoordinateLink } from "@/app/admin/places/actions";

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
  status?: PlaceStatus;
};

export interface PlaceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (place: PlaceSelectResult) => void;
}

// ─── URL 감지 헬퍼 ────────────────────────────────────────────────────────────

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//.test(s) || s.startsWith("maps.app.goo.gl");
}

function extractPlaceNameFromUrl(url: string): string | null {
  const match = url.match(/\/place\/([^/@?#]+)/);
  if (!match?.[1]) return null;
  const name = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
  return name || null;
}

// ─── 내부 검색 패널 (APIProvider 컨텍스트 필요) ───────────────────────────────

function PlaceSearchContent({
  onSelect,
  onClose,
}: {
  onSelect: (place: PlaceSelectResult) => void;
  onClose: () => void;
}) {
  const placesLib = useMapsLibrary("places");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // URL 모드 전용 상태
  const [coordResult, setCoordResult] = useState<{ lat: number; lng: number; googleMapsUrl: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);

  const doSearch = useCallback(
    async (input: string) => {
      if (!placesLib || !input.trim()) {
        setResults([]);
        setSelectedIndex(null);
        return;
      }
      setIsSearching(true);
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
        setResults(places ?? []);
        setSelectedIndex(places?.length > 0 ? 0 : null);
      } catch {
        setResults([]);
        setSelectedIndex(null);
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib],
  );

  useEffect(() => {
    const input = query.trim();
    if (!input) {
      setResults([]);
      setCoordResult(null);
      setUrlError(null);
      setSelectedIndex(null);
      return;
    }

    if (looksLikeUrl(input)) {
      // URL 모드: 텍스트 검색 결과 초기화
      setResults([]);
      setSelectedIndex(null);
      const timer = setTimeout(async () => {
        setIsResolvingUrl(true);
        setCoordResult(null);
        setUrlError(null);
        try {
          const result = await resolveCoordinateLink(input);
          if ("error" in result) {
            if (result.error.includes("공식 등록 장소")) {
              // 공식 장소 URL → 장소명 추출 후 텍스트 검색
              const placeName = extractPlaceNameFromUrl(input);
              if (placeName) {
                await doSearch(placeName);
              } else {
                setUrlError("장소명을 URL에서 추출할 수 없습니다. 장소명으로 직접 검색해주세요.");
              }
            } else {
              setUrlError(result.error);
            }
          } else {
            setCoordResult(result);
          }
        } finally {
          setIsResolvingUrl(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // 텍스트 검색 모드
      setCoordResult(null);
      setUrlError(null);
      const timer = setTimeout(() => doSearch(input), 600);
      return () => clearTimeout(timer);
    }
  }, [query, doSearch]);

  const selected = selectedIndex !== null ? (results[selectedIndex] as any) : null;
  const selectedLat = selected?.location?.lat();
  const selectedLng = selected?.location?.lng();

  // 지도 미리보기 좌표: 좌표 결과 우선
  const displayLat = coordResult ? coordResult.lat : selectedLat;
  const displayLng = coordResult ? coordResult.lng : selectedLng;

  const handleConfirm = async () => {
    // 좌표 URL 모드
    if (coordResult) {
      onSelect({
        name: "",
        address: "",
        nameEn: "",
        addressEn: "",
        phone: "",
        operatingHours: [],
        googleMapsUrl: coordResult.googleMapsUrl,
        lat: coordResult.lat,
        lng: coordResult.lng,
        googlePlaceId: "",
      });
      onClose();
      return;
    }

    if (!selected) return;
    const placeId = selected.id;
    setIsConfirming(true);
    try {
      let nameEn = "";
      let addressEn = "";
      let operatingHours: string[] = [];
      let status: PlaceStatus | undefined;

      try {
        const fields =
          "displayName,formattedAddress,regularOpeningHours,businessStatus";
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&languageCode=en&key=${API_KEY}`,
        );
        if (res.ok) {
          const data = await res.json();
          const rawNameEn = data.displayName?.text ?? "";
          // Google이 영문명 없이 한글 그대로 반환하는 경우 로마자 변환
          nameEn = /[\uAC00-\uD7A3]/.test(rawNameEn)
            ? Romanize.from(selected.displayName ?? "")
            : rawNameEn;
          addressEn = data.formattedAddress ?? "";
          operatingHours = data.regularOpeningHours?.weekdayDescriptions ?? [];

          const bStatus: string = data.businessStatus ?? "";
          if (bStatus === "OPERATIONAL") status = "OPEN";
          else if (bStatus === "CLOSED_TEMPORARILY") status = "CLOSED_TEMP";
          else if (bStatus === "CLOSED_PERMANENTLY")
            status = "CLOSED_PERMANENT";
        }
      } catch {
        // 영어 정보 실패 시 빈값 유지
      }

      onSelect({
        name: selected.displayName ?? "",
        address: selected.formattedAddress ?? "",
        nameEn,
        addressEn,
        phone: selected.nationalPhoneNumber ?? "",
        operatingHours,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        lat: selectedLat,
        lng: selectedLng,
        googlePlaceId: placeId,
        status,
      });
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  const isBusy = isSearching || isResolvingUrl;
  const canConfirm = coordResult !== null || selected !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소명, 주소 또는 구글 맵 URL 입력..."
          className="pl-9 pr-9"
          autoFocus
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setCoordResult(null);
                setUrlError(null);
                setSelectedIndex(null);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 결과 리스트 + 지도 미리보기 */}
      <div className="grid grid-cols-[2fr_3fr] gap-3 h-[440px]">
        {/* 왼쪽: 결과 리스트 */}
        <div className="border rounded-lg overflow-y-auto">
          {coordResult ? (
            /* 좌표 결과 */
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-2">
                <MapPin className="mx-auto h-8 w-8 text-brand" />
                <p className="text-sm font-medium">좌표 위치</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {coordResult.lat.toFixed(6)}, {coordResult.lng.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Google Place ID 없이 등록됩니다
                </p>
              </div>
            </div>
          ) : urlError ? (
            /* URL 오류 */
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-sm text-destructive">{urlError}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {query.trim()
                ? isBusy ? "검색 중..." : "검색 결과가 없습니다."
                : "장소명, 주소 또는\n구글 맵 URL을 입력하세요."}
            </div>
          ) : (
            <ul>
              {results.map((result, i) => {
                const r = result as any;
                return (
                  <li key={r.id ?? i}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-2 border-b last:border-b-0 transition-colors ${
                        selectedIndex === i
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">
                          {r.displayName}
                        </div>
                        {r.formattedAddress && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {r.formattedAddress}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 오른쪽: 지도 미리보기 */}
        <div className="overflow-hidden rounded-lg border">
          {displayLat !== undefined && displayLng !== undefined ? (
            <Map
              key={`${displayLat}-${displayLng}`}
              center={{ lat: displayLat, lng: displayLng }}
              zoom={15}
              mapId={MAP_ID}
              gestureHandling="none"
              disableDefaultUI
              style={{ width: "100%", height: "100%" }}
            >
              <AdvancedMarker
                position={{ lat: displayLat, lng: displayLng }}
              />
            </Map>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              장소를 선택하면
              <br />
              지도가 표시됩니다.
            </div>
          )}
        </div>
      </div>

      {/* 하단: 선택 정보 + 버튼 */}
      <div className="flex items-center justify-between gap-4 border-t pt-3">
        <div className="min-w-0 flex-1">
          {coordResult ? (
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">좌표 위치</p>
              <p className="text-xs text-muted-foreground font-mono">
                {coordResult.lat.toFixed(6)}, {coordResult.lng.toFixed(6)}
              </p>
            </div>
          ) : selected ? (
            <div className="space-y-0.5">
              <p className="truncate text-sm font-semibold">
                {selected.displayName}
              </p>
              {selected.formattedAddress && (
                <p className="truncate text-xs text-muted-foreground">
                  {selected.formattedAddress}
                </p>
              )}
              {selected.nationalPhoneNumber && (
                <p className="text-xs text-muted-foreground">
                  {selected.nationalPhoneNumber}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              장소를 선택해주세요.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                불러오는 중...
              </>
            ) : (
              "이 장소로 선택"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 공개 컴포넌트 ─────────────────────────────────────────────────────────────

export function PlaceSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: PlaceSearchDialogProps) {
  if (!API_KEY) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-full">
        <DialogHeader>
          <DialogTitle>위치 검색</DialogTitle>
        </DialogHeader>
        <APIProvider apiKey={API_KEY} language="en">
          <PlaceSearchContent
            onSelect={onSelect}
            onClose={() => onOpenChange(false)}
          />
        </APIProvider>
      </DialogContent>
    </Dialog>
  );
}
