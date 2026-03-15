"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Star,
  X,
} from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import {
  labelBackground,
  resolveTagColors,
  resolveTopicColors,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { ScrapButton } from "../../_components/ScrapButton";

type PlaceSheetState = "tab-only" | "half" | "full";

const PLACE_TAB_ONLY_HEIGHT = 72;
const PLACE_FULL_TOP_MARGIN = 12;

interface Props {
  place: MapPlace | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  onClose: () => void;
}

function PostCard({
  post,
  isSaved,
  tagGroupMap,
}: {
  post: MapPost;
  isSaved: boolean;
  tagGroupMap: TagGroupColorMap;
}) {
  const topicLabels = post.topics.slice(0, 1).map((topic) => {
    const colors = resolveTopicColors(topic);
    return { text: topic.nameEn, ...colors };
  });
  const tagLabels = post.tags.slice(0, 1).map((tag) => {
    const colors = resolveTagColors(tag, tagGroupMap.get(tag.group));
    return { text: tag.name, ...colors };
  });
  const labels = [...topicLabels, ...tagLabels];

  return (
    <Link href={`/posts/${post.slug}`} className="w-[152px] shrink-0">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.titleEn}
            fill
            unoptimized
            className="object-cover"
            sizes="152px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* 상단: 토픽·태그 배지 */}
        {labels.length > 0 && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 [--pill-fs:0.6rem]">
            {labels.map((label, i) => (
              <LabelBadge
                key={i}
                text={label.text}
                background={labelBackground(label)}
                color={label.textColorHex}
              />
            ))}
          </div>
        )}
        {/* 하단 좌: 제목 */}
        <div className="absolute bottom-2 left-2 right-8">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
            {post.titleEn}
          </p>
        </div>
        {/* 하단 우: 스크랩 버튼 */}
        <div className="absolute bottom-2 right-2">
          <ScrapButton postId={post.id} initialSaved={isSaved} size="sm" />
        </div>
      </div>
    </Link>
  );
}

export function PlaceBottomSheet({ place, savedPostIds, tagGroupMap, onClose }: Props) {
  const [state, setState] = useState<PlaceSheetState>("half");
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);
  const lastPointerY = useRef(0);
  const lastPointerTime = useRef(0);
  const dragVelocityY = useRef(0);

  useEffect(() => {
    if (place) {
      setState("half");
      setInfoOpen(false);
    }
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!place) return null;

  const hasExtraInfo = !!(place.phone || place.operatingHours?.length);

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-50 bg-background rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
      style={sheetStyle}
    >
      {/* 드래그 가능 상단 영역 */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{ touchAction: "none" }}
        className="shrink-0 px-5 pb-4"
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* 장소명 + 공유 + 닫기 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-lg font-bold leading-tight">{place.nameEn}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onClose} aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* 주소 + 복사 */}
        {place.addressEn && (
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="size-3 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground flex-1 leading-snug">{place.addressEn}</p>
            <button onClick={() => copyToClipboard(place.addressEn!)} aria-label="Copy address">
              {copied ? (
                <Check className="size-3.5 text-brand" />
              ) : (
                <Copy className="size-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        {/* 평점 + 지도 링크 */}
        <div className="flex items-center gap-2 flex-wrap">
          {place.rating != null && (
            <span className="flex items-center gap-1 text-sm font-semibold">
              <Star className="size-3.5 fill-brand stroke-brand" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {place.googleMapsUrl && (
            <a
              href={place.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            >
              <ExternalLink className="size-3" />
              Google Maps
            </a>
          )}
          {place.naverMapsUrl && (
            <a
              href={place.naverMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            >
              <ExternalLink className="size-3" />
              Naver Maps
            </a>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 이미지 */}
        {place.imageUrl && (
          <div className="relative w-full aspect-video">
            <Image
              src={place.imageUrl}
              alt={place.nameEn}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        {/* More info 토글 */}
        {hasExtraInfo && (
          <div className="border-t border-border/50 mx-5">
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className="flex items-center justify-between w-full py-3 text-xs font-medium text-muted-foreground"
            >
              <span>More info</span>
              <ChevronDown
                className="size-3.5 transition-transform duration-200"
                style={{ transform: infoOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {infoOpen && (
              <div className="pb-4 space-y-3">
                {place.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <a href={`tel:${place.phone}`} className="text-xs">
                      {place.phone}
                    </a>
                  </div>
                )}
                {place.operatingHours && place.operatingHours.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Clock className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      {place.operatingHours.map((line, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[0.6rem] text-muted-foreground/60 pt-1">via Google Maps</p>
              </div>
            )}
          </div>
        )}

        {/* 관련 포스트 */}
        {place.posts.length > 0 && (
          <>
            {!hasExtraInfo && <div className="border-t border-border/50 mx-5" />}
            <div className="px-5 pt-3 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Related Posts{place.posts.length > 1 ? ` · ${place.posts.length}` : ""}
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-6 overflow-x-auto scrollbar-hide">
              {place.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isSaved={savedPostIds.has(post.id)}
                  tagGroupMap={tagGroupMap}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
