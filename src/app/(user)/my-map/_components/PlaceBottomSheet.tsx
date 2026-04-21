"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSheetDrag } from "../_hooks/useSheetDrag";
import { useToast } from "../../_hooks/useToast";
import Image from "next/image";
import { isExternalImage, photoKey } from "@/lib/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CloseButton } from "./CloseButton";
import { LabelBadge } from "@/components/LabelBadge";
import {
  labelBackground,
  resolveTagColors,
  resolveTopicColors,
  K_MEDIA_GROUP,
  selectHomeLabels,
  type LabelSlot,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { ScrapButton } from "../../_components/ScrapButton";

type PlaceSheetState = "tab-only" | "half" | "full";

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
  const topicSlots: LabelSlot[] = post.topics.map((topic) => ({
    group: "TOPIC",
    name: topic.nameEn,
    displayLabel: null,
    colors: resolveTopicColors(topic),
  }));
  const otherSlots: LabelSlot[] = post.tags
    .filter((tag) => tag.group !== K_MEDIA_GROUP)
    .map((tag) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: gc?.displayLabel ?? null, colors: resolveTagColors(tag, gc) };
    });
  const labels = selectHomeLabels(topicSlots, otherSlots);

  const cardImageUrl = post.imageUrl ?? post.images[0] ?? null;

  return (
    <Link href={`/posts/${post.slug}`} className="flex gap-3 items-center bg-white border border-border/50 rounded-2xl px-3 py-3">
      {/* 썸네일 */}
      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted">
        {cardImageUrl ? (
          <Image src={cardImageUrl} alt={post.titleEn} fill unoptimized={isExternalImage(cardImageUrl)} className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2 mb-1">{post.titleEn}</p>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 [--pill-fs:0.6rem]">
            {labels.map((label, i) => (
              <LabelBadge key={i} text={label.text} background={labelBackground(label)} color={label.textColorHex} />
            ))}
          </div>
        )}
      </div>
      {/* 스크랩 버튼 */}
      <div className="shrink-0">
        <ScrapButton postId={post.id} initialSaved={isSaved} size="md" />
      </div>
    </Link>
  );
}

export function PlaceBottomSheet({ place, savedPostIds, tagGroupMap, onClose }: Props) {
  const [state, setState] = useState<PlaceSheetState>("half");
  const { toast, showToast } = useToast();

  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const minHeightRef = useRef(140);
  const [minHeight, setMinHeight] = useState(140);

  useLayoutEffect(() => {
    if (place && headerRef.current) {
      const h = headerRef.current.offsetHeight;
      minHeightRef.current = h;
      setMinHeight(h);
    }
  }, [place]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (place) setState("half");
  }, [place]);

  const PLACE_SHEET_STATES = ["tab-only", "half", "full"] as const;

  function getSnapHeights() {
    const containerH = window.innerHeight - 64;
    return [minHeightRef.current, Math.round(containerH * 0.5), containerH - PLACE_FULL_TOP_MARGIN];
  }

  const { isDragging: isDraggingState, dragHandlers } = useSheetDrag({
    sheetRef,
    stateOrder: PLACE_SHEET_STATES,
    getSnapHeights,
    currentState: state,
    onStateChange: setState,
  });

  const sheetStyle: React.CSSProperties = {
    height:
      state === "tab-only"
        ? `${minHeight}px`
        : state === "half"
        ? "calc((100dvh - 64px) * 0.5)"
        : `calc(100dvh - 64px - ${PLACE_FULL_TOP_MARGIN}px)`,
    transition: isDraggingState ? "none" : "height 320ms cubic-bezier(0.32, 0.72, 0, 1)",
  };

  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    showToast("Address copied");
  }

  if (!place) return null;

  return (
    <>
    {toast && (
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
        {toast.message}
      </div>
    )}
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
      style={sheetStyle}
    >
      {/* 드래그 가능 상단 영역 */}
      <div
        {...dragHandlers}
        ref={headerRef}
        className="shrink-0 px-5 pb-3"
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* 장소명 + 공유 + 닫기 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-lg font-bold leading-tight">{place.nameEn}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <CloseButton onClick={onClose} />
          </div>
        </div>

        {/* 주소 + 복사 */}
        {place.addressEn && (
          <button
            onClick={() => copyToClipboard(place.addressEn!)}
            className="flex items-center gap-1.5 mb-2 text-left w-full active:opacity-60"
          >
            <p className="text-xs text-muted-foreground leading-snug">{place.addressEn}</p>
          </button>
        )}

        {/* 지도 링크 */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Google Maps", url: place.googleMapsUrl },
            { label: "Naver Maps", url: place.naverMapsUrl },
            { label: "Street View", url: place.streetViewUrl },
          ].filter((l) => l.url).map((l) => (
            <a
              key={l.label}
              href={l.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            >
              <ExternalLink className="size-3" />
              {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* 스크롤 영역 */}
      {(() => {
        const seen = new Set<string>();
        const carouselUrls: string[] = [];

        const add = (url: string | null | undefined): boolean => {
          if (!url) return false;
          const key = photoKey(url);
          if (seen.has(key)) return false;
          seen.add(key);
          carouselUrls.push(url);
          return true;
        };

        // 토픽 있는 포스트 우선, 동순위는 등록 순 유지
        const sortedPosts = [...place.posts].sort((a, b) =>
          (b.topics.length > 0 ? 1 : 0) - (a.topics.length > 0 ? 1 : 0)
        );
        // 1순위: 포스트 썸네일 (포스트별 1장, 토픽 있는 포스트 우선)
        sortedPosts.forEach((post) => add(post.imageUrl));
        // 2순위: 포스트 비썸네일 이미지
        sortedPosts.forEach((post) => post.images.forEach((url) => add(url)));
        // 3순위: 장소 대표 이미지 (imageUrl)
        add(place.imageUrl);
        // 4순위: 나머지 장소 이미지 (placeImages, sortOrder 순)
        place.placeImages.forEach((img) => add(img.url));

        return (
          <div className="flex-1 overflow-y-auto">
            {/* 이미지 슬라이더 */}
            {carouselUrls.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 [scroll-padding-left:20px]">
                {carouselUrls.map((url, i) => (
                  <div
                    key={url}
                    className={`relative aspect-[3/2] w-[40%] shrink-0 snap-start rounded-xl overflow-hidden bg-muted ${i === 0 ? "ml-5" : ""} ${i === carouselUrls.length - 1 ? "mr-5" : ""}`}
                  >
                    <Image src={url} alt="" fill unoptimized={isExternalImage(url)} className="object-cover" sizes="40vw" />
                  </div>
                ))}
              </div>
            )}

            {/* 관련 포스트 */}
            {place.posts.length > 0 && (
              <>
                <div className="border-t border-border/50 mx-5" />
                <div className="px-5 pt-3 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Related Posts{place.posts.length > 1 ? ` · ${place.posts.length}` : ""}
                  </p>
                </div>
                <div className="px-5 pb-6 space-y-3">
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
        );
      })()}
    </div>
    </>
  );
}
