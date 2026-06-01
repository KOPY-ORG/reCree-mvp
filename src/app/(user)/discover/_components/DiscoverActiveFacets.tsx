"use client";

import { X, Search } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";

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
}: Props) {
  const hasQuery = query.trim() !== "";
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0;

  if (!hasQuery && !hasFilters) return null;

  return (
    <div className="absolute top-[60px] inset-x-0 z-[60] px-3 pb-2">
      <div
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [--pill-py:0.35rem]"
      >
        {hasQuery && (
          <button
            type="button"
            onClick={onClearQuery}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 rounded-full bg-white shadow font-semibold text-xs whitespace-nowrap active:opacity-70 transition-opacity"
            style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
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
              className="shrink-0 shadow active:opacity-70"
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
              className="shrink-0 shadow active:opacity-70"
              onClick={() => onRemoveTag(id)}
            >
              <X className="size-3" />
            </LabelBadge>
          );
        })}
      </div>
    </div>
  );
}
