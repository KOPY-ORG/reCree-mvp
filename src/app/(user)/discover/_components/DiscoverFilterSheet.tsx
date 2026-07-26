"use client";

import { X, MapPin } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
import { AllBadge } from "@/components/AllBadge";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  badgeRingStyle,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { Level0TopicDeep } from "@/lib/topic-queries";
import type { TagGroupWithTags } from "@/lib/filter-queries";
import { KPOP_NAME } from "@/lib/filter-params";

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
  onToggleTopic: (id: string, coveringGroupId?: string, chipIds?: string[]) => void;
  onToggleTopicGroup: (groupId: string, descendantIds: string[]) => void;
  onToggleTag: (id: string) => void;
  onReset: () => void;
  onApply: () => void;
  regions?: { slug: string; label: string }[];
  stagedRegion?: string | null;
  onToggleRegion?: (slug: string) => void;
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
  onToggleTopicGroup,
  onToggleTag,
  onReset,
  onApply,
  regions = [],
  stagedRegion = null,
  onToggleRegion,
}: Props) {
  const totalSelected = stagedTopicIds.length + stagedTagIds.length + (stagedRegion != null ? 1 : 0);

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
            <div className="flex flex-wrap gap-x-2 gap-y-2 [--pill-py:0.3rem]">
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
                    className="shrink-0 active:opacity-70 !px-3 h-7 !font-semibold shadow-sm"
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
                    className="shrink-0 active:opacity-70 !px-3 h-7 !font-semibold shadow-sm"
                    onClick={() => onToggleTag(id)}
                  >
                    <X className="size-3" />
                  </LabelBadge>
                );
              })}
              {stagedRegion != null && (() => {
                const label = regions.find((r) => r.slug === stagedRegion)?.label ?? stagedRegion;
                return (
                  <button
                    type="button"
                    onClick={() => onToggleRegion?.(stagedRegion)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-opacity"
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    {label}
                    <X className="size-3" />
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* 스크롤 본문 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 pt-4 pb-8 space-y-6 [--pill-py:0.3rem]">

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
                const chipIds = allL2.map(({ l2 }) => l2.id);
                // 그룹 collapse용 하위 노드: L1 id + L2 id 전부 (중복 staged 방지)
                const descendantIds = [...l1s.map((l1) => l1.id), ...chipIds];
                const rootCovered = stagedTopicIds.includes(root.id);
                return (
                  <section key={root.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold">{root.nameEn}</h3>
                      <AllBadge
                        active={rootCovered}
                        onClick={() => onToggleTopicGroup(root.id, descendantIds)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                      {allL2.map(({ l2, l1 }) => {
                        const resolved = resolveTopicColors({
                          ...l2,
                          parent: { ...l1, parent: root },
                        });
                        const covering = rootCovered ? { id: root.id, chipIds } : null;
                        const isSelected = stagedTopicIds.includes(l2.id) || covering !== null;
                        return (
                          <LabelBadge
                            key={l2.id}
                            as="button"
                            text={l2.nameEn}
                            background={labelBackground({ text: "", ...resolved })}
                            color={resolved.textColorHex}
                            className={`shrink-0 transition-all active:opacity-70 !px-3 h-7 !font-semibold shadow-sm${covering ? " opacity-60" : ""}`}
                            style={badgeRingStyle(resolved.colorHex, isSelected)}
                            onClick={() => onToggleTopic(l2.id, covering?.id, covering?.chipIds)}
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
                // 렌더되는 칩이 L1(leaf)이므로 chipIds = descendantIds = L1 id 전부
                const chipIds = l1s.map((l1) => l1.id);
                const rootCovered = stagedTopicIds.includes(root.id);
                return (
                  <section key={root.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold">{root.nameEn}</h3>
                      <AllBadge
                        active={rootCovered}
                        onClick={() => onToggleTopicGroup(root.id, chipIds)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                      {l1s.map((l1) => {
                        const resolved = resolveTopicColors({ ...l1, parent: root });
                        const covering = rootCovered ? { id: root.id, chipIds } : null;
                        const isSelected = stagedTopicIds.includes(l1.id) || covering !== null;
                        return (
                          <LabelBadge
                            key={l1.id}
                            as="button"
                            text={l1.nameEn}
                            background={labelBackground({ text: "", ...resolved })}
                            color={resolved.textColorHex}
                            className={`shrink-0 transition-all active:opacity-70 !px-3 h-7 !font-semibold shadow-sm${covering ? " opacity-60" : ""}`}
                            style={badgeRingStyle(resolved.colorHex, isSelected)}
                            onClick={() => onToggleTopic(l1.id, covering?.id, covering?.chipIds)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              // 분기 C: L1 소제목 + L2 칩 (K-CONTENT류)
              // root All의 chipIds(degrade용)는 L2만, descendantIds(collapse용)는 L1+L2 전부
              const allRenderedL2Ids = l1s.flatMap((l1) => l1.children.map((l2) => l2.id));
              const rootDescendantIds = [...l1s.map((l1) => l1.id), ...allRenderedL2Ids];
              const rootCovered = stagedTopicIds.includes(root.id);
              return (
                <section key={root.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold">{root.nameEn}</h3>
                    <AllBadge
                      active={rootCovered}
                      onClick={() => onToggleTopicGroup(root.id, rootDescendantIds)}
                      className="shrink-0"
                    />
                  </div>
                  <div className="space-y-4">
                    {l1s.map((l1) => {
                      if (l1.children.length === 0) return null;
                      const l1ChipIds = l1.children.map((l2) => l2.id);
                      const l1Covered = stagedTopicIds.includes(l1.id);
                      return (
                        <div key={l1.id}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {l1.nameEn}
                            </p>
                            <AllBadge
                              active={l1Covered}
                              onClick={() => onToggleTopicGroup(l1.id, l1ChipIds)}
                              className="shrink-0"
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                            {l1.children.map((l2) => {
                              const resolved = resolveTopicColors({
                                ...l2,
                                parent: { ...l1, parent: root },
                              });
                              // 넓은 쪽(root) 우선, 그다음 l1
                              const covering = rootCovered
                                ? { id: root.id, chipIds: allRenderedL2Ids }
                                : l1Covered
                                ? { id: l1.id, chipIds: l1ChipIds }
                                : null;
                              const isSelected = stagedTopicIds.includes(l2.id) || covering !== null;
                              return (
                                <LabelBadge
                                  key={l2.id}
                                  as="button"
                                  text={l2.nameEn}
                                  background={labelBackground({ text: "", ...resolved })}
                                  color={resolved.textColorHex}
                                  className={`shrink-0 transition-all active:opacity-70 !px-3 h-7 !font-semibold shadow-sm${covering ? " opacity-60" : ""}`}
                                  style={badgeRingStyle(resolved.colorHex, isSelected)}
                                  onClick={() => onToggleTopic(l2.id, covering?.id, covering?.chipIds)}
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
                          className="shrink-0 transition-all active:opacity-70 !px-3 h-7 !font-semibold shadow-sm"
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

            {/* ── 지역 섹션 ── */}
            {regions.length > 0 && (
              <section>
                <h3 className="text-sm font-bold mb-3">REGION</h3>
                <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                  {regions.map((r) => {
                    const isSelected = stagedRegion === r.slug;
                    return (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => onToggleRegion?.(r.slug)}
                        className={`shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full bg-white text-xs font-semibold whitespace-nowrap shadow-sm active:opacity-70 transition-all ${
                          isSelected ? "ring-2 ring-foreground" : ""
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

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
