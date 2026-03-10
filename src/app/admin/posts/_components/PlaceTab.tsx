"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Plus, X, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlaceForForm } from "./PostForm";

const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <div className="h-40 rounded-lg border bg-muted/50" /> },
);

interface Props {
  selectedPlace: PlaceForForm | null;
  onPickPlace: () => void;
  onViewDetail: () => void;
}

export function PlaceTab({ selectedPlace, onPickPlace, onViewDetail }: Props) {
  return (
    <div className="space-y-6">
      <Card className="gap-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">장소</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedPlace ? (
            <>
              {selectedPlace.imageUrl && (
                <div className="relative h-40 w-full overflow-hidden rounded-md border">
                  <Image
                    src={selectedPlace.imageUrl}
                    alt={selectedPlace.nameKo}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="font-medium text-sm">{selectedPlace.nameKo}</p>
                {selectedPlace.nameEn && (
                  <p className="text-xs text-muted-foreground">{selectedPlace.nameEn}</p>
                )}
                {selectedPlace.addressKo && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{selectedPlace.addressKo}</span>
                  </div>
                )}
                {selectedPlace.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{selectedPlace.phone}</span>
                  </div>
                )}
              </div>

              {selectedPlace.latitude && selectedPlace.longitude ? (
                <div className="overflow-hidden rounded-md">
                  <MapPreview
                    lat={selectedPlace.latitude}
                    lng={selectedPlace.longitude}
                    zoom={15}
                    height={240}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 rounded-md border bg-muted/50 text-xs text-muted-foreground">
                  지도 정보 없음
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={onPickPlace}
                >
                  <X className="h-3 w-3 mr-1" />
                  변경
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={onViewDetail}
                >
                  상세 보기
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onPickPlace}
            >
              <Plus className="h-4 w-4 mr-2" />
              장소 연결
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
