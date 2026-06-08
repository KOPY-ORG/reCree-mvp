"use client";

import { useToast } from "@/app/(user)/_hooks/useToast";
import { ExternalLink, Copy, Map, X } from "lucide-react";
import { type TagGroupColorMap } from "@/lib/post-labels";
import type { MapPlace } from "@/lib/map-queries";
import { PostCardCarousel } from "./PostCardCarousel";

interface Props {
  place: MapPlace | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  onClose: () => void;
}

export function PlaceBottomSheet({ place, savedPostIds, tagGroupMap, onClose }: Props) {
  const { toast, showToast } = useToast();

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast("Address copied");
  }

  if (!place) return null;

  const iconBtnCls = "flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm shrink-0";

  return (
    <>
      {toast && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
      <div className="absolute inset-x-4 bottom-4 z-50 bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] overflow-hidden max-h-[50%]">

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-2">
          {/* 1행: 장소명(슬라이드) + 아이콘 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
              <h2 className="text-lg font-bold whitespace-nowrap">{place.nameEn ?? place.nameKo}</h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {place.googleMapsUrl && (
                <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={iconBtnCls}>
                  <ExternalLink className="size-4" />
                </a>
              )}
              {place.naverMapsUrl && (
                <a href={place.naverMapsUrl} target="_blank" rel="noopener noreferrer" className={iconBtnCls}>
                  <ExternalLink className="size-4" />
                </a>
              )}
              {place.streetViewUrl && (
                <a href={place.streetViewUrl} target="_blank" rel="noopener noreferrer" className={iconBtnCls}>
                  <Map className="size-4" />
                </a>
              )}
              <button type="button" onClick={onClose} className="shrink-0 active:opacity-60">
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* 2행: 주소(슬라이드) + 복사 */}
          {(() => {
            const address = place.addressEn ?? place.addressKo;
            return address ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
                  <span className="whitespace-nowrap">{address}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(address)}
                  className="shrink-0 active:opacity-60"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ) : null;
          })()}
        </div>

        {/* 포스트 캐러셀 */}
        <div className="pt-2 pb-3">
          <PostCardCarousel
            key={place.id}
            posts={place.posts}
            savedPostIds={savedPostIds}
            tagGroupMap={tagGroupMap}
            placeImages={
              place.placeImages.length > 0
                ? place.placeImages
                : place.posts.flatMap((p) => p.images.map((url) => ({ url })))
            }
          />
        </div>
      </div>
    </>
  );
}
