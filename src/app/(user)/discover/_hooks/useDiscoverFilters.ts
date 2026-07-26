"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { parseFilterParams, serializeFilterParams, topicSlugToId, KPOP_NAME } from "@/lib/filter-params";
import { getPlaceRegionSlug, getPlaceRegionLabel } from "@/lib/region-utils";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { Level0TopicDeep } from "@/lib/topic-queries";
import type { TagGroupWithTags } from "@/lib/filter-queries";
import type { MapPlace } from "@/lib/map-queries";

export type ChipInfo = { id: string; label: string; bg: string; fg: string };

interface UseDiscoverFiltersParams {
  topicTree: Level0TopicDeep[];
  tagGroups: TagGroupWithTags[];
  allPlaces: (MapPlace & { isSaved?: boolean })[];
  onExitQuery: () => void;
  onFiltersApplied: () => void;
}

export function useDiscoverFilters({
  topicTree,
  tagGroups,
  allPlaces,
  onExitQuery,
  onFiltersApplied,
}: UseDiscoverFiltersParams) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── state ──
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [stagedTopicIds, setStagedTopicIds] = useState<string[]>([]);
  const [stagedTagIds, setStagedTagIds] = useState<string[]>([]);
  const [stagedTagGroupKeys, setStagedTagGroupKeys] = useState<string[]>([]);
  const [stagedRegion, setStagedRegion] = useState<string | null>(null);
  const [appliedTopicIds, setAppliedTopicIds] = useState<string[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<string[]>([]);
  const [appliedTagGroupKeys, setAppliedTagGroupKeys] = useState<string[]>([]);
  const [appliedRegion, setAppliedRegion] = useState<string | null>(null);
  const urlFilterInitRef = useRef(false);

  // ── memo ──
  // allPlaces에서 등장하는 도시만 추출 (level=1은 parent로 rollup). useEffect보다 먼저 선언.
  const availableCities = useMemo(() => {
    const map = new Map<string, string>(); // slug → label(원본 nameEn)
    for (const place of allPlaces) {
      const slug = getPlaceRegionSlug(place.area);
      const label = getPlaceRegionLabel(place.area);
      if (!slug || !label) continue;
      if (!map.has(slug)) map.set(slug, label);
    }
    return [...map.entries()]
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allPlaces]);

  const topicChipMap = useMemo(() => {
    const map = new Map<string, ChipInfo>();
    for (const root of topicTree) {
      const l1s = root.children;
      if (l1s.length === 0) continue;
      if (root.nameEn === KPOP_NAME) {
        for (const l1 of l1s)
          for (const l2 of l1.children) {
            const r = resolveTopicColors({ ...l2, parent: { ...l1, parent: root } });
            map.set(l2.id, { id: l2.id, label: l2.nameEn, bg: labelBackground({ text: "", ...r }), fg: r.textColorHex });
          }
        continue;
      }
      const hasL2 = l1s.some((l1) => l1.children.length > 0);
      if (!hasL2) {
        for (const l1 of l1s) {
          const r = resolveTopicColors({ ...l1, parent: root });
          map.set(l1.id, { id: l1.id, label: l1.nameEn, bg: labelBackground({ text: "", ...r }), fg: r.textColorHex });
        }
      } else {
        for (const l1 of l1s)
          for (const l2 of l1.children) {
            const r = resolveTopicColors({ ...l2, parent: { ...l1, parent: root } });
            map.set(l2.id, { id: l2.id, label: l2.nameEn, bg: labelBackground({ text: "", ...r }), fg: r.textColorHex });
          }
      }
    }
    // 상단 facet chip이 L0/L1(그룹) topic id도 라벨·색으로 해석하도록, 위 분기에서 등록되지 않은 그룹 노드만 추가 등록.
    // (이미 있는 id는 덮어쓰지 않음 — 기존 칩 색 유지. root는 parent 없이 호출, l1은 parent: root)
    for (const root of topicTree) {
      if (!map.has(root.id)) {
        const r = resolveTopicColors({ ...root });
        map.set(root.id, { id: root.id, label: root.nameEn, bg: labelBackground({ text: "", ...r }), fg: r.textColorHex });
      }
      for (const l1 of root.children) {
        if (!map.has(l1.id)) {
          const r = resolveTopicColors({ ...l1, parent: root });
          map.set(l1.id, { id: l1.id, label: l1.nameEn, bg: labelBackground({ text: "", ...r }), fg: r.textColorHex });
        }
      }
    }
    return map;
  }, [topicTree]);

  const tagChipMap = useMemo(() => {
    const map = new Map<string, ChipInfo>();
    for (const group of tagGroups)
      for (const tag of group.tags) {
        const r = resolveTagColors(tag, group);
        map.set(tag.id, { id: tag.id, label: tag.name, bg: labelBackground({ text: "", ...r }), fg: tag.textColorHex ?? group.textColorHex ?? DEFAULT_TEXT });
      }
    return map;
  }, [tagGroups]);

  const tagGroupChipMap = useMemo(() => {
    const map = new Map<string, ChipInfo>();
    for (const g of tagGroups) {
      const bg = labelBackground({ text: "", colorHex: g.colorHex, colorHex2: g.colorHex2, gradientDir: g.gradientDir, gradientStop: g.gradientStop, textColorHex: g.textColorHex });
      map.set(g.group, { id: g.group, label: g.nameEn, bg, fg: g.textColorHex });
    }
    return map;
  }, [tagGroups]);

  const btsTopicId = useMemo(() => topicSlugToId(topicTree, "bts"), [topicTree]);
  const btsChipInfo = useMemo(
    () => (btsTopicId ? (topicChipMap.get(btsTopicId) ?? null) : null),
    [btsTopicId, topicChipMap]
  );

  // ── effect ──
  // URL ?topics=<slug,…> / ?tags=<slug,…> / ?region=<slug> → 마운트 1회 초기 필터 적용
  useEffect(() => {
    if (urlFilterInitRef.current) return;
    urlFilterInitRef.current = true;
    const parsed = parseFilterParams(
      new URLSearchParams(searchParams.toString()),
      topicTree,
      tagGroups
    );
    if (parsed.topicIds.length > 0) { setAppliedTopicIds(parsed.topicIds); setStagedTopicIds(parsed.topicIds); }
    if (parsed.tagIds.length > 0) { setAppliedTagIds(parsed.tagIds); setStagedTagIds(parsed.tagIds); }
    if (parsed.tagGroupKeys.length > 0) { setAppliedTagGroupKeys(parsed.tagGroupKeys); setStagedTagGroupKeys(parsed.tagGroupKeys); }
    if (parsed.region && availableCities.some((c) => c.slug === parsed.region)) {
      setAppliedRegion(parsed.region);
      setStagedRegion(parsed.region);
    }
  }, [searchParams, topicTree, tagGroups, availableCities]);

  // ── 파생 ──
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedTagGroupKeys.length > 0 || appliedRegion !== null;
  const hasPostLevelFilter = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedTagGroupKeys.length > 0;

  // ── 핸들러 ──
  function commitFilters(next: { topicIds: string[]; tagIds: string[]; tagGroupKeys: string[]; region: string | null }) {
    setAppliedTopicIds(next.topicIds);
    setAppliedTagIds(next.tagIds);
    setAppliedTagGroupKeys(next.tagGroupKeys);
    setAppliedRegion(next.region);
    const params = serializeFilterParams(next, { topicTree, tagGroups }, new URLSearchParams(searchParams.toString()));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const exitResultMode = () => {
    onExitQuery();
    commitFilters({ topicIds: [], tagIds: [], tagGroupKeys: [], region: null });
  };

  const openFilter = () => {
    setStagedTopicIds(appliedTopicIds);
    setStagedTagIds(appliedTagIds);
    setStagedTagGroupKeys(appliedTagGroupKeys);
    setStagedRegion(appliedRegion);
    setIsFilterOpen(true);
  };
  const applyFilters = () => {
    commitFilters({ topicIds: stagedTopicIds, tagIds: stagedTagIds, tagGroupKeys: stagedTagGroupKeys, region: stagedRegion });
    setIsFilterOpen(false);
    onFiltersApplied();
  };
  const closeFilter = () => setIsFilterOpen(false);
  const resetStaged = () => { setStagedTopicIds([]); setStagedTagIds([]); setStagedTagGroupKeys([]); setStagedRegion(null); };
  const removeAppliedTopic = (id: string) =>
    commitFilters({ topicIds: appliedTopicIds.filter((x) => x !== id), tagIds: appliedTagIds, tagGroupKeys: appliedTagGroupKeys, region: appliedRegion });
  const removeAppliedTag = (id: string) =>
    commitFilters({ topicIds: appliedTopicIds, tagIds: appliedTagIds.filter((x) => x !== id), tagGroupKeys: appliedTagGroupKeys, region: appliedRegion });
  const removeAppliedTagGroup = (key: string) =>
    commitFilters({ topicIds: appliedTopicIds, tagIds: appliedTagIds, tagGroupKeys: appliedTagGroupKeys.filter((k) => k !== key), region: appliedRegion });

  const toggleTopic = (id: string) =>
    setStagedTopicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleTag = (id: string) =>
    setStagedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleRegion = (slug: string) =>
    setStagedRegion((prev) => prev === slug ? null : slug);

  return {
    isFilterOpen,
    stagedTopicIds,
    stagedTagIds,
    stagedTagGroupKeys,
    stagedRegion,
    appliedTopicIds,
    appliedTagIds,
    appliedTagGroupKeys,
    appliedRegion,
    hasFilters,
    hasPostLevelFilter,
    availableCities,
    topicChipMap,
    tagChipMap,
    tagGroupChipMap,
    btsTopicId,
    btsChipInfo,
    commitFilters,
    exitResultMode,
    openFilter,
    applyFilters,
    closeFilter,
    resetStaged,
    removeAppliedTopic,
    removeAppliedTag,
    removeAppliedTagGroup,
    toggleTopic,
    toggleTag,
    toggleRegion,
  };
}
