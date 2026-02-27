"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ExternalLink, MapPin, Phone, Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getPlaceDetail } from "../_actions/post-actions";

const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> },
);

type PlaceDetail = Awaited<ReturnType<typeof getPlaceDetail>>;

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "영업 중", variant: "default" },
  CLOSED_TEMP: { label: "임시 휴업", variant: "secondary" },
  CLOSED_PERMANENT: { label: "폐업", variant: "destructive" },
};

interface PlaceDetailSheetProps {
  placeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaceDetailSheet({
  placeId,
  open,
  onOpenChange,
}: PlaceDetailSheetProps) {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !placeId) {
      setPlace(null);
      return;
    }
    setLoading(true);
    setError(false);
    getPlaceDetail(placeId)
      .then((data) => {
        setPlace(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [open, placeId]);

  const statusInfo = place?.status ? STATUS_LABEL[place.status] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] flex flex-col p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <SheetTitle>장소 상세</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="p-5 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              장소 정보를 불러올 수 없습니다.
            </p>
          </div>
        )}

        {!loading && !error && place && (
          <div className="flex-1">
            {/* 썸네일 이미지 */}
            {place.imageUrl && (
              <div className="relative h-48 w-full">
                <Image
                  src={place.imageUrl}
                  alt={place.nameKo}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* 이름 + 상태 배지 */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold leading-tight">
                    {place.nameKo}
                  </h2>
                  {statusInfo && (
                    <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                {place.nameEn && (
                  <p className="text-sm text-muted-foreground">{place.nameEn}</p>
                )}
              </div>

              {/* 주소 */}
              {(place.addressKo || place.addressEn) && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    {place.addressKo && <p>{place.addressKo}</p>}
                    {place.addressEn && (
                      <p className="text-xs">{place.addressEn}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 전화번호 */}
              {place.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{place.phone}</span>
                </div>
              )}

              {/* 평점 */}
              {place.rating != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{place.rating.toFixed(1)}</span>
                </div>
              )}

              {/* 태그 목록 */}
              {place.placeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {place.placeTags.map(({ tag }) => (
                    <span
                      key={tag.nameKo}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        tag.colorHex
                          ? { backgroundColor: tag.colorHex, color: "#fff" }
                          : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                      }
                    >
                      {tag.nameKo}
                    </span>
                  ))}
                </div>
              )}

              {/* 지도 미리보기 */}
              {place.latitude && place.longitude ? (
                <MapPreview
                  lat={place.latitude}
                  lng={place.longitude}
                  zoom={15}
                  height={200}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                  지도 정보 없음
                </div>
              )}

              {/* 영업시간 */}
              {place.operatingHours && Array.isArray(place.operatingHours) && (place.operatingHours as string[]).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    영업시간
                  </p>
                  <div className="space-y-0.5">
                    {(place.operatingHours as string[]).map((line, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 구분선 + 편집 링크 */}
              <div className="border-t pt-4">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a
                    href={`/admin/places/${place.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    전체 편집 페이지 열기
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
