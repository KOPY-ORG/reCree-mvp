"use client";

import { X, Search, CalendarDays, MapPin } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import { EVENT_RED } from "@/lib/event-format";
import { FEATURED_REGION_SLUGS } from "@/lib/region-utils";
import type { ActiveEventCollection } from "@/lib/event-collection-queries";

type ChipInfo = { id: string; label: string; bg: string; fg: string };

interface Props {
  query: string;
  appliedTopicIds: string[];
  appliedTagIds: string[];
  topicChipMap: Map<string, ChipInfo>;
  tagChipMap: Map<string, ChipInfo>;
  onClearQuery: () => void;
  onRemoveTopic: (id: string) => void;
  onRemoveTag: (id: string) => void;
  eventCollections?: ActiveEventCollection[];
  onEventCollectionClick?: (id: string) => void;
  quickTopicChip?: ChipInfo | null;
  onQuickTopicClick?: () => void;
  regions?: { slug: string; label: string }[];
  appliedRegion?: string | null;
  onRegionChange?: (slug: string | null) => void;
}

export function DiscoverActiveFacets({
  query,
  appliedTopicIds,
  appliedTagIds,
  topicChipMap,
  tagChipMap,
  onClearQuery,
  onRemoveTopic,
  onRemoveTag,
  eventCollections = [],
  onEventCollectionClick,
  quickTopicChip,
  onQuickTopicClick,
  regions = [],
  appliedRegion = null,
  onRegionChange,
}: Props) {
  const hasQuery = query.trim() !== "";
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedRegion !== null;
  const hasEventCollections = eventCollections.length > 0;
  const showEventCollections = hasEventCollections && !hasQuery && !hasFilters;
  const showQuickChips = !hasQuery && !hasFilters && !!quickTopicChip;
  // FEATURED 순서 유지 + availableCities에 없는 도시(장소 0개) 자동 제외
  const featuredRegions = FEATURED_REGION_SLUGS
    .map((slug) => regions.find((r) => r.slug === slug) ?? null)
    .filter((r): r is { slug: string; label: string } => r !== null);
  const showRegionChips = featuredRegions.length >= 1;

  if (!showEventCollections && !showQuickChips && !hasQuery && !hasFilters && !showRegionChips) return null;

  return (
    <div className="absolute top-[60px] inset-x-0 z-[60] px-3 pb-2 space-y-1.5">
      {(showEventCollections || showQuickChips || showRegionChips) && !hasQuery && !hasFilters && (
        <div className="flex gap-2 overflow-x-auto py-[6px] -my-[6px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {showEventCollections && eventCollections.map((col) => {
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
          {showQuickChips && quickTopicChip && (
            <button
              type="button"
              onClick={onQuickTopicClick}
              className="shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-opacity"
              style={{ background: quickTopicChip.bg, color: quickTopicChip.fg }}
            >
              {quickTopicChip.label}
            </button>
          )}
          {showRegionChips && featuredRegions.map(({ slug, label }) => (
            <button
              key={slug}
              type="button"
              onClick={() => onRegionChange?.(appliedRegion === slug ? null : slug)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-all ${
                appliedRegion === slug ? "ring-2 ring-foreground" : ""
              }`}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              {label}
            </button>
          ))}
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
          {appliedRegion !== null && (() => {
            const label = regions.find((r) => r.slug === appliedRegion)?.label ?? appliedRegion;
            return (
              <button
                type="button"
                onClick={() => onRegionChange?.(null)}
                className="shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-opacity"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {label}
                <X className="size-3" />
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
