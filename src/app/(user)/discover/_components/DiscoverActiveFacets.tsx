"use client";

import { X, Search } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
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

function DonutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 6A6 6 0 1 1 0 6a6 6 0 0 1 12 0ZM8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
        fill="white"
      />
    </svg>
  );
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
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full font-semibold text-xs leading-none whitespace-nowrap shadow-md active:opacity-70 transition-opacity"
                style={{
                  background: "#F01941",
                  color: "#fff",
                  paddingTop: "0.3rem",
                  paddingBottom: "0.3rem",
                  paddingLeft: "0.5rem",
                  paddingRight: "0.75rem",
                }}
              >
                <DonutIcon />
                {nameEn}
              </button>
            );
          })}
          {showQuickChips && quickTopicChip && (
            <button
              type="button"
              onClick={onQuickTopicClick}
              className="shrink-0 inline-flex items-center gap-1 rounded-full font-semibold text-xs leading-none whitespace-nowrap shadow-md active:opacity-70 transition-opacity"
              style={{
                background: quickTopicChip.bg,
                color: quickTopicChip.fg,
                paddingTop: "0.3rem",
                paddingBottom: "0.3rem",
                paddingLeft: "0.625rem",
                paddingRight: "0.625rem",
              }}
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
              className="shrink-0 inline-flex items-center gap-1 px-2 rounded-full bg-white shadow-md font-semibold text-xs whitespace-nowrap active:opacity-70 transition-opacity"
              style={{ paddingTop: "0.3rem", paddingBottom: "0.3rem" }}
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
                className="shrink-0 shadow-md active:opacity-70"
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
                className="shrink-0 shadow-md active:opacity-70"
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
