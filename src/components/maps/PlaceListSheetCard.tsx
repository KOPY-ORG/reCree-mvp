"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { topicMatchesFilter } from "@/lib/map-utils";
import type { MapPost } from "@/lib/map-queries";
import {
  resolveTagColors,
  resolveTopicColors,
  labelBackground,
  K_MEDIA_GROUP,
  selectHomeLabels,
  type LabelSlot,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";


interface Props {
  post: MapPost;
  place: {
    id: string;
    nameEn: string | null;
    area: {
      nameEn: string | null;
      nameKo: string;
      parent: { nameEn: string | null; nameKo: string } | null;
    } | null;
    markerColor?: string;
  };
  isSaved: boolean;
  isFocused?: boolean;
  tagGroupMap: TagGroupColorMap;
  matchedTopicIds?: string[];
  onCardTap: (placeId: string) => void;
  onViewPlace: (placeId: string) => void;
  onPostNavigate?: () => void;
}

export function PlaceListSheetCard({ post, place, isSaved, isFocused, tagGroupMap, matchedTopicIds, onCardTap, onViewPlace, onPostNavigate }: Props) {
  const cardImageUrl = post.imageUrl ?? post.images[0] ?? null;

  const areaLabel = place.area
    ? (place.area.nameEn ?? place.area.nameKo) +
      (place.area.parent ? ", " + (place.area.parent.nameEn ?? place.area.parent.nameKo) : "")
    : null;

  const sortedTopics = matchedTopicIds?.length
    ? [...post.topics].sort((a, b) => {
        const aM = matchedTopicIds.some((id) => topicMatchesFilter(a, id)) ? 0 : 1;
        const bM = matchedTopicIds.some((id) => topicMatchesFilter(b, id)) ? 0 : 1;
        return aM - bM;
      })
    : post.topics;
  const topicSlots: LabelSlot[] = sortedTopics.map((topic) => ({
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

  return (
    <div
      className={`relative flex gap-3 items-center bg-white border border-border/40 rounded-2xl px-3 py-3 cursor-pointer active:opacity-70 transition-opacity ${isFocused ? "ring-2 ring-brand" : ""}`}
      onClick={() => onCardTap(place.id)}
    >
      {/* 스크랩 버튼 — absolute top-right */}
      <div className="absolute -top-1.5 right-3 z-10">
        <ScrapButton
          postId={post.id}
          initialSaved={isSaved}
          size="lg"
          unsavedClassName="text-border/40 fill-white"
          strokeLinejoin="miter"
        />
      </div>

      {/* 썸네일 */}
      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted">
        {cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(cardImageUrl)}
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="flex-1 min-w-0 pr-1">
        {/* 1. 라벨 chips */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 [--pill-fs:0.625rem] mb-1">
            {labels.map((label, i) => (
              <LabelBadge key={i} text={label.text} background={labelBackground(label)} color={label.textColorHex} />
            ))}
          </div>
        )}

        {/* 2. 제목 */}
        <h3 className="text-sm font-semibold line-clamp-2 mb-1.5">{post.titleEn}</h3>

        {/* 3. 메타 줄 */}
        <div className="flex items-center gap-2">
          {areaLabel && (
            <div className="flex items-center gap-0.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{areaLabel}</span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewPlace(place.id); }}
            className="text-xs px-2.5 py-1 rounded-full bg-white shadow-sm text-muted-foreground shrink-0"
          >
            View on map
          </button>
        </div>
      </div>

      {/* ">" 포스트 상세 링크 */}
      <Link
        href={`/posts/${post.slug}`}
        onClick={(e) => { e.stopPropagation(); onPostNavigate?.(); }}
        className="shrink-0 self-stretch flex items-center px-2"
        aria-label="View post"
      >
        <ChevronRight className="w-6 h-6 text-muted-foreground" />
      </Link>
    </div>
  );
}
