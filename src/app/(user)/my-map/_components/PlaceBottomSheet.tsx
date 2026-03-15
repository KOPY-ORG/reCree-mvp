"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, X } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, resolveTagColors, type TagGroupColorMap } from "@/lib/post-labels";
import type { MapPlace } from "@/lib/map-queries";
import { ScrapButton } from "../../_components/ScrapButton";

type PlaceSheetState = "tab-only" | "half" | "full";

const PLACE_TAB_ONLY_HEIGHT = 72;
const PLACE_FULL_TOP_MARGIN = 12; // 검색바 컨테이너 pt-3 (12px)

interface Props {
  place: MapPlace | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  onClose: () => void;
}

export function PlaceBottomSheet({ place, savedPostIds, tagGroupMap, onClose }: Props) {
  const [state, setState] = useState<PlaceSheetState>("half");
  const [isDraggingState, setIsDraggingState] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);
  const lastPointerY = useRef(0);
  const lastPointerTime = useRef(0);
  const dragVelocityY = useRef(0);

  useEffect(() => {
    if (place) setState("half");
  }, [place?.id]);

  function getSnapHeights(): [number, number, number] {
    const containerH = window.innerHeight - 64;
    return [PLACE_TAB_ONLY_HEIGHT, Math.round(containerH * 0.5), containerH - PLACE_FULL_TOP_MARGIN];
  }

  function handleDragStart(e: React.PointerEvent) {
    if (!sheetRef.current) return;
    const currentH = sheetRef.current.getBoundingClientRect().height;
    dragStartY.current = e.clientY;
    dragStartHeight.current = currentH;
    isDragging.current = true;
    lastPointerY.current = e.clientY;
    lastPointerTime.current = e.timeStamp;
    dragVelocityY.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingState(true);
  }

  function handleDragMove(e: React.PointerEvent) {
    if (!isDragging.current || !sheetRef.current) return;
    const newH = dragStartHeight.current - (e.clientY - dragStartY.current);
    const containerH = window.innerHeight - 64;
    const clampedH = Math.max(PLACE_TAB_ONLY_HEIGHT, Math.min(newH, containerH - PLACE_FULL_TOP_MARGIN));
    sheetRef.current.style.height = `${clampedH}px`;

    const dt = e.timeStamp - lastPointerTime.current;
    if (dt > 0) {
      dragVelocityY.current = (e.clientY - lastPointerY.current) / dt;
    }
    lastPointerY.current = e.clientY;
    lastPointerTime.current = e.timeStamp;
  }

  function handleDragEnd() {
    if (!isDragging.current) return;
    isDragging.current = false;

    const FLICK_THRESHOLD = 0.5;
    const stateOrder: PlaceSheetState[] = ["tab-only", "half", "full"];

    let nextState: PlaceSheetState;
    if (dragVelocityY.current > FLICK_THRESHOLD) {
      const cur = stateOrder.indexOf(state);
      nextState = stateOrder[Math.max(0, cur - 1)];
    } else if (dragVelocityY.current < -FLICK_THRESHOLD) {
      const cur = stateOrder.indexOf(state);
      nextState = stateOrder[Math.min(stateOrder.length - 1, cur + 1)];
    } else {
      const currentH = sheetRef.current?.getBoundingClientRect().height ?? 0;
      const snapHeights = getSnapHeights();
      const dists = snapHeights.map((h) => Math.abs(currentH - h));
      const minIdx = dists.indexOf(Math.min(...dists));
      nextState = stateOrder[minIdx];
    }

    setIsDraggingState(false);
    setState(nextState);
  }

  const sheetStyle: React.CSSProperties = {
    height:
      state === "tab-only"
        ? `${PLACE_TAB_ONLY_HEIGHT}px`
        : state === "half"
        ? "calc((100dvh - 64px) * 0.5)"
        : `calc(100dvh - 64px - ${PLACE_FULL_TOP_MARGIN}px)`,
    transition: isDraggingState ? "none" : "height 320ms cubic-bezier(0.32, 0.72, 0, 1)",
  };

  if (!place) return null;

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-50 bg-background rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
      style={sheetStyle}
    >
      {/* 드래그 가능 헤더 */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{ touchAction: "none" }}
        className="shrink-0"
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* 장소명 + X */}
        <div className="flex items-start justify-between gap-2 px-5 pb-3">
          <div>
            <p className="text-base font-bold">{place.nameEn}</p>
            {place.nameKo && place.nameKo !== place.nameEn && (
              <p className="text-xs text-muted-foreground mt-0.5">{place.nameKo}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {place.rating != null && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="size-3.5 fill-brand stroke-brand" />
                <span className="font-semibold">{place.rating.toFixed(1)}</span>
              </span>
            )}
            <button onClick={onClose} aria-label="닫기">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {place.posts.length > 1 && (
          <p className="text-xs text-muted-foreground px-5 pb-2">{place.posts.length} posts</p>
        )}
      </div>

      {/* 포스트 목록 */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {place.posts.map((post) => {
          const isSaved = savedPostIds.has(post.id);
          return (
            <div key={post.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/posts/${post.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative size-[72px] shrink-0 rounded-lg overflow-hidden bg-muted">
                  {post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={post.titleEn}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="72px"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2 leading-snug">{post.titleEn}</p>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 [--pill-fs:0.625rem]">
                      {post.tags.slice(0, 2).map((tag) => {
                        const colors = resolveTagColors(tag, tagGroupMap.get(tag.group));
                        return (
                          <LabelBadge
                            key={tag.id}
                            text={tag.name}
                            background={labelBackground({ text: tag.name, ...colors })}
                            color={colors.textColorHex}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </Link>
              <ScrapButton postId={post.id} initialSaved={isSaved} size="md" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
