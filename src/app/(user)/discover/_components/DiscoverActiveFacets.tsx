"use client";

import { X, Search, CalendarDays, MapPin } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import { EVENT_RED } from "@/lib/event-format";
import type { ActiveEventCollection } from "@/lib/event-collection-queries";
import type { DistrictOption } from "../_hooks/useDiscoverFilters";

type ChipInfo = { id: string; label: string; bg: string; fg: string };

interface Props {
  query: string;
  appliedTopicIds: string[];
  appliedTagIds: string[];
  appliedTagGroupKeys: string[];
  topicChipMap: Map<string, ChipInfo>;
  tagChipMap: Map<string, ChipInfo>;
  tagGroupChipMap: Map<string, ChipInfo>;
  onClearQuery: () => void;
  onRemoveTopic: (id: string) => void;
  onRemoveTag: (id: string) => void;
  onRemoveTagGroup: (key: string) => void;
  eventCollections?: ActiveEventCollection[];
  onEventCollectionClick?: (id: string) => void;
  regions?: { slug: string; label: string }[];
  appliedRegion?: string | null;
  /** 지금 걸린 시도의 시군구 목록 — 칩 글자를 만들 때만 쓴다 */
  districts?: DistrictOption[];
  appliedDistrict?: string | null;
  onRegionChange?: (slug: string | null) => void;
  /**
   * 이 줄이 앉는 높이. 검색바 바로 아래(top-[60px])가 기본이고, 구독 토픽 칩 줄이
   * 그 자리를 쓰면 부르는 쪽이 한 줄만큼 내려 준다 — 두 줄이 겹치지 않게.
   * 값을 Tailwind 클래스로 받는 이유는 임의값 클래스를 템플릿으로 조립하면
   * 스캐너가 못 찾아 유틸리티가 생성되지 않기 때문이다 (BottomNav.tsx 와 같은 이유).
   */
  topClass?: string;
}

export function DiscoverActiveFacets({
  query,
  appliedTopicIds,
  appliedTagIds,
  appliedTagGroupKeys,
  topicChipMap,
  tagChipMap,
  tagGroupChipMap,
  onClearQuery,
  onRemoveTopic,
  onRemoveTag,
  onRemoveTagGroup,
  eventCollections = [],
  onEventCollectionClick,
  regions = [],
  appliedRegion = null,
  districts = [],
  appliedDistrict = null,
  onRegionChange,
  topClass = "top-[60px]",
}: Props) {
  const hasQuery = query.trim() !== "";
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedTagGroupKeys.length > 0 || appliedRegion !== null;
  const hasEventCollections = eventCollections.length > 0;
  // 첫 줄은 이벤트 컬렉션뿐이다. 지역과 토픽은 필터 시트에서 고른다 —
  // 어느 지역·어느 아이돌을 위로 올릴지 코드가 정하면 그 선택을 설명할 길이 없다.
  const showEventCollections = hasEventCollections && !hasQuery && !hasFilters;

  if (!showEventCollections && !hasQuery && !hasFilters) return null;

  return (
    <div className={`absolute ${topClass} inset-x-0 z-[60] px-3 pb-2 space-y-1.5`}>
      {showEventCollections && (
        <div className="flex gap-2 overflow-x-auto py-[6px] -my-[6px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {eventCollections.map((col) => {
            const nameEn =
              col.translations.find((t) => t.locale === "en")?.name ?? col.slug;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onEventCollectionClick?.(col.slug)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-opacity"
                style={{ background: EVENT_RED, color: "#fff" }}
              >
                <CalendarDays className="w-3 h-3 shrink-0" />
                {nameEn}
              </button>
            );
          })}
        </div>
      )}

      {(hasQuery || hasFilters) && (
        <div className="flex gap-2 overflow-x-auto py-[6px] -my-[6px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [--pill-py:0.3rem]">
          {hasQuery && (
            <button
              type="button"
              onClick={onClearQuery}
              className="shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white shadow-sm font-semibold text-xs whitespace-nowrap active:opacity-70 transition-opacity"
            >
              <Search className="size-3 shrink-0" />
              <span className="max-w-[120px] truncate">{query.trim()}</span>
              <X className="size-3 shrink-0" />
            </button>
          )}
          {appliedTopicIds.map((id) => {
            const chip = topicChipMap.get(id);
            if (!chip) return null;
            return (
              <LabelBadge
                key={id}
                as="button"
                text={chip.label}
                background={chip.bg}
                color={chip.fg}
                className="shrink-0 !px-3 h-7 !font-semibold shadow-sm active:opacity-70"
                onClick={() => onRemoveTopic(id)}
              >
                <X className="size-3" />
              </LabelBadge>
            );
          })}
          {appliedTagIds.map((id) => {
            const chip = tagChipMap.get(id);
            if (!chip) return null;
            return (
              <LabelBadge
                key={id}
                as="button"
                text={chip.label}
                background={chip.bg}
                color={chip.fg}
                className="shrink-0 !px-3 h-7 !font-semibold shadow-sm active:opacity-70"
                onClick={() => onRemoveTag(id)}
              >
                <X className="size-3" />
              </LabelBadge>
            );
          })}
          {appliedTagGroupKeys.map((key) => {
            const chip = tagGroupChipMap.get(key);
            if (!chip) return null;
            return (
              <LabelBadge
                key={key}
                as="button"
                text={chip.label}
                background={chip.bg}
                color={chip.fg}
                className="shrink-0 !px-3 h-7 !font-semibold shadow-sm active:opacity-70"
                onClick={() => onRemoveTagGroup(key)}
              >
                <X className="size-3" />
              </LabelBadge>
            );
          })}
          {appliedRegion !== null && (() => {
            const regionLabel = regions.find((r) => r.slug === appliedRegion)?.label ?? appliedRegion;
            const districtLabel = districts.find((d) => d.slug === appliedDistrict)?.label ?? appliedDistrict;
            // 여기 X 는 지역 필터를 통째로 벗긴다. 시트 트레이와 달리 한 단씩 벗길
            // 자리가 아니다 — 시군구만 지우고 싶으면 시트를 열어 고르는 쪽이 빠르다
            return (
              <button
                type="button"
                onClick={() => onRegionChange?.(null)}
                className="shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-opacity"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {appliedDistrict !== null ? `${districtLabel} · ${regionLabel}` : regionLabel}
                <X className="size-3" />
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
