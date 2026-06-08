"use client";

import { X, Search, CalendarDays } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import { EVENT_RED } from "@/lib/event-format";
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
}: Props) {
  const hasQuery = query.trim() !== "";
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0;
  const hasEventCollections = eventCollections.length > 0;
  const showEventCollections = hasEventCollections && !hasQuery && !hasFilters;
  const showQuickChips = !hasQuery && !hasFilters && !!quickTopicChip;

  if (!showEventCollections && !showQuickChips && !hasQuery && !hasFilters) return null;

  return (
    <div className="absolute top-[60px] inset-x-0 z-[60] px-3 pb-2 space-y-1.5">
      {(showEventCollections || showQuickChips) && (
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
        </div>
      )}
    </div>
  );
}
