"use client";

import { X } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  badgeRingStyle,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { Level0TopicDeep } from "@/lib/topic-queries";
import type { TagGroupWithTags } from "@/lib/filter-queries";

const KPOP_NAME = "K-POP";

type ChipInfo = { id: string; label: string; bg: string; fg: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  topicTree: Level0TopicDeep[];
  tagGroups: TagGroupWithTags[];
  topicChipMap: Map<string, ChipInfo>;
  tagChipMap: Map<string, ChipInfo>;
  stagedTopicIds: string[];
  stagedTagIds: string[];
  onToggleTopic: (id: string) => void;
  onToggleTag: (id: string) => void;
  onReset: () => void;
  onApply: () => void;
}

export function DiscoverFilterSheet({
  isOpen,
  onClose,
  topicTree,
  tagGroups,
  topicChipMap,
  tagChipMap,
  stagedTopicIds,
  stagedTagIds,
  onToggleTopic,
  onToggleTag,
  onReset,
  onApply,
}: Props) {
  const totalSelected = stagedTopicIds.length + stagedTagIds.length;

  return (
    <>
      {/* 딤 overlay — 항상 마운트, opacity 전환 */}
      <div
        className={`absolute inset-0 z-[64] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 시트 본체 — 항상 마운트, translateY 전환 */}
      <div
        className={`absolute top-12 inset-x-0 bottom-0 z-[65] bg-background rounded-t-2xl flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
          <h2 className="text-base font-bold">Filters</h2>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="flex items-center justify-center size-8 rounded-full bg-muted active:opacity-60 transition-opacity"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Selected 트레이 — 선택 0개면 렌더 안 함 */}
        {totalSelected > 0 && (
          <div className="shrink-0 mx-4 mb-4 rounded-xl bg-brand-sub3 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Selected · {totalSelected}
              </span>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-muted-foreground active:opacity-60"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-2 [--pill-py:0.25rem]">
              {stagedTopicIds.map((id) => {
                const chip = topicChipMap.get(id);
                if (!chip) return null;
                return (
                  <LabelBadge
                    key={id}
                    as="button"
                    text={chip.label}
                    background={chip.bg}
                    color={chip.fg}
                    className="shrink-0 active:opacity-70"
                    onClick={() => onToggleTopic(id)}
                  >
                    <X className="size-3" />
                  </LabelBadge>
                );
              })}
              {stagedTagIds.map((id) => {
                const chip = tagChipMap.get(id);
                if (!chip) return null;
                return (
                  <LabelBadge
                    key={id}
                    as="button"
                    text={chip.label}
                    background={chip.bg}
                    color={chip.fg}
                    className="shrink-0 active:opacity-70"
                    onClick={() => onToggleTag(id)}
                  >
                    <X className="size-3" />
                  </LabelBadge>
                );
              })}
            </div>
          </div>
        )}

        {/* 스크롤 본문 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 pt-4 pb-8 space-y-6 [--pill-py:0.25rem]">

            {/* ── 토픽 섹션 ── */}
            {topicTree.map((root) => {
              const l1s = root.children;

              // 분기 D: L1 없음 → 건너뜀
              if (l1s.length === 0) return null;

              // 분기 A: K-POP → L1 헤더 없이 모든 L2 평탄
              if (root.nameEn === KPOP_NAME) {
                const allL2 = l1s.flatMap((l1) =>
                  l1.children.map((l2) => ({ l2, l1 }))
                );
                return (
                  <section key={root.id}>
                    <h3 className="text-sm font-bold mb-3">{root.nameEn}</h3>
                    <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                      {allL2.map(({ l2, l1 }) => {
                        const resolved = resolveTopicColors({
                          ...l2,
                          parent: { ...l1, parent: root },
                        });
                        const isSelected = stagedTopicIds.includes(l2.id);
                        return (
                          <LabelBadge
                            key={l2.id}
                            as="button"
                            text={l2.nameEn}
                            background={labelBackground({ text: "", ...resolved })}
                            color={resolved.textColorHex}
                            className="shrink-0 transition-all active:opacity-70"
                            style={badgeRingStyle(resolved.colorHex, isSelected)}
                            onClick={() => onToggleTopic(l2.id)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              const hasL2 = l1s.some((l1) => l1.children.length > 0);

              // 분기 B: L2 없음 → L1 평탄 칩
              if (!hasL2) {
                return (
                  <section key={root.id}>
                    <h3 className="text-sm font-bold mb-3">{root.nameEn}</h3>
                    <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                      {l1s.map((l1) => {
                        const resolved = resolveTopicColors({ ...l1, parent: root });
                        const isSelected = stagedTopicIds.includes(l1.id);
                        return (
                          <LabelBadge
                            key={l1.id}
                            as="button"
                            text={l1.nameEn}
                            background={labelBackground({ text: "", ...resolved })}
                            color={resolved.textColorHex}
                            className="shrink-0 transition-all active:opacity-70"
                            style={badgeRingStyle(resolved.colorHex, isSelected)}
                            onClick={() => onToggleTopic(l1.id)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              // 분기 C: L1 소제목 + L2 칩 (K-CONTENT류)
              return (
                <section key={root.id}>
                  <h3 className="text-sm font-bold mb-3">{root.nameEn}</h3>
                  <div className="space-y-4">
                    {l1s.map((l1) => {
                      if (l1.children.length === 0) return null;
                      return (
                        <div key={l1.id}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {l1.nameEn}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                            {l1.children.map((l2) => {
                              const resolved = resolveTopicColors({
                                ...l2,
                                parent: { ...l1, parent: root },
                              });
                              const isSelected = stagedTopicIds.includes(l2.id);
                              return (
                                <LabelBadge
                                  key={l2.id}
                                  as="button"
                                  text={l2.nameEn}
                                  background={labelBackground({ text: "", ...resolved })}
                                  color={resolved.textColorHex}
                                  className="shrink-0 transition-all active:opacity-70"
                                  style={badgeRingStyle(resolved.colorHex, isSelected)}
                                  onClick={() => onToggleTopic(l2.id)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* ── 태그 섹션 ── */}
            {tagGroups
              .filter((group) => group.tags.length > 0)
              .map((group) => (
                <section key={group.group}>
                  <h3 className="text-sm font-bold mb-3">
                    {group.nameEn || group.group}
                  </h3>
                  <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                    {group.tags.map((tag) => {
                      const resolved = resolveTagColors(tag, group);
                      const isSelected = stagedTagIds.includes(tag.id);
                      return (
                        <LabelBadge
                          key={tag.id}
                          as="button"
                          text={tag.name}
                          background={labelBackground({ text: "", ...resolved })}
                          color={tag.textColorHex ?? group.textColorHex ?? DEFAULT_TEXT}
                          className="shrink-0 transition-all active:opacity-70"
                          style={badgeRingStyle(
                            tag.colorHex ?? group.colorHex ?? null,
                            isSelected
                          )}
                          onClick={() => onToggleTag(tag.id)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}

          </div>
        </div>

        {/* 하단 바 */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-[1] h-11 rounded-full border border-border text-sm font-medium active:opacity-60 transition-opacity"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-[2] h-11 rounded-full bg-foreground text-background text-sm font-semibold active:opacity-70 transition-opacity"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
