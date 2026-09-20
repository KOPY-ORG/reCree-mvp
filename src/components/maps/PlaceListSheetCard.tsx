"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { topicMatchesFilter } from "@/lib/map-utils";
import type { MapPost } from "@/lib/map-queries";
import { primaryPlaceType, type PlaceTypeLink } from "@/lib/place-types";
import {
  labelBackground,
  selectCardLabels,
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
    /** 대표 순서. 캐시된 옛 payload 에는 없을 수 있다 — primaryPlaceType 으로만 읽는다 */
    placePlaceTypes?: PlaceTypeLink[];
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

  // "Cafe · Mapo-gu" — 대표 타입이 지역 앞에 붙는다. 둘 중 하나만 있으면 있는 쪽만 쓴다
  const typeName = primaryPlaceType(place.placePlaceTypes)?.name ?? null;
  const metaLabel = [typeName, areaLabel].filter(Boolean).join(" · ") || null;

  const sortedTopics = matchedTopicIds?.length
    ? [...post.topics].sort((a, b) => {
        const aM = matchedTopicIds.some((id) => topicMatchesFilter(a, id)) ? 0 : 1;
        const bM = matchedTopicIds.some((id) => topicMatchesFilter(b, id)) ? 0 : 1;
        return aM - bM;
      })
    : post.topics;
  // 장소 타입은 아래 메타 줄(metaLabel)이 이미 적는다 — 배지로 또 넣지 않으려고
  // placeTypes 를 넘기지 않는다. 그러면 두 칸이 토픽 · 팬 맥락 태그로 채워진다.
  const labels = selectCardLabels(
    { topics: sortedTopics, tags: post.tags, tagGroupMap },
    "home",
  );

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

        {/* 3. 메타 줄 — [버튼(focused만)] [MapPin] [지역명 flex-1 truncate] */}
        <div className="flex items-center gap-2 min-w-0">
          {isFocused && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewPlace(place.id); }}
              className="text-xs px-2.5 py-1 rounded-full bg-white shadow-sm text-muted-foreground shrink-0"
            >
              View on map
            </button>
          )}
          {metaLabel && (
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{metaLabel}</span>
            </div>
          )}
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
