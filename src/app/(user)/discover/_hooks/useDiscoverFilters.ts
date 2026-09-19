"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { parseFilterParams, serializeFilterParams, KPOP_NAME } from "@/lib/filter-params";
import type { FilterState } from "@/lib/filter-params";
import {
  getPlaceRegionSlug,
  getPlaceRegionLabel,
  getPlaceDistrictSlug,
  getPlaceDistrictLabel,
} from "@/lib/region-utils";
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

/** 필터에 뜨는 지역 칩 하나 — count 는 그 지역에 있는 장소 수. 시도·시군구가 같은 모양이다 */
export type DistrictOption = { slug: string; label: string; count: number };

interface UseDiscoverFiltersParams {
  topicTree: Level0TopicDeep[];
  tagGroups: TagGroupWithTags[];
  allPlaces: (MapPlace & { isSaved?: boolean })[];
  onExitQuery: () => void;
  onFiltersApplied: () => void;
  /** 필터를 next 로 바꿨을 때 지금 선택된 장소가 결과에 남는지. false 면 commitFilters 가 ?place= 를 같이 지운다 */
  shouldKeepSelectedPlace: (next: FilterState) => boolean;
}

export function useDiscoverFilters({
  topicTree,
  tagGroups,
  allPlaces,
  onExitQuery,
  onFiltersApplied,
  shouldKeepSelectedPlace,
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
  const [stagedDistrict, setStagedDistrict] = useState<string | null>(null);
  const [appliedTopicIds, setAppliedTopicIds] = useState<string[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<string[]>([]);
  const [appliedTagGroupKeys, setAppliedTagGroupKeys] = useState<string[]>([]);
  const [appliedRegion, setAppliedRegion] = useState<string | null>(null);
  const [appliedDistrict, setAppliedDistrict] = useState<string | null>(null);
  const urlFilterInitRef = useRef(false);

  // ── memo ──
  // allPlaces에서 등장하는 도시만 추출 (level=1은 parent로 rollup). useEffect보다 먼저 선언.
  // 정렬은 장소 수 내림차순이다 — 알파벳순이면 82개인 Seoul 이 맨 끝에 앉는다.
  // 동점은 이름순이라 목록이 렌더마다 흔들리지 않는다 (availableDistricts 와 같은 규칙).
  const availableCities = useMemo(() => {
    const map = new Map<string, DistrictOption>();
    for (const place of allPlaces) {
      const slug = getPlaceRegionSlug(place.area);
      const label = getPlaceRegionLabel(place.area);
      if (!slug || !label) continue;
      const found = map.get(slug);
      if (found) found.count += 1;
      else map.set(slug, { slug, label, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allPlaces]);

  // 시도 slug → 그 안에서 장소가 있는 시군구 목록. availableCities 와 같은 규칙으로
  // "장소가 있는 것만" 담는다 — 서울은 25구 중 15개, 경기는 31곳 중 9곳만 값이 있다.
  // 시도에 직접 붙은 장소(세종)는 시군구가 없어 어느 목록에도 들어가지 않는다.
  const availableDistricts = useMemo(() => {
    const byRegion = new Map<string, Map<string, DistrictOption>>();
    for (const place of allPlaces) {
      const regionSlug = getPlaceRegionSlug(place.area);
      const slug = getPlaceDistrictSlug(place.area);
      const label = getPlaceDistrictLabel(place.area);
      if (!regionSlug || !slug || !label) continue;
      let districts = byRegion.get(regionSlug);
      if (!districts) {
        districts = new Map();
        byRegion.set(regionSlug, districts);
      }
      const found = districts.get(slug);
      if (found) found.count += 1;
      else districts.set(slug, { slug, label, count: 1 });
    }
    // 장소 많은 순. 동점이면 이름순이라 목록이 렌더마다 흔들리지 않는다
    return new Map<string, DistrictOption[]>(
      [...byRegion].map(([regionSlug, districts]) => [
        regionSlug,
        [...districts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      ])
    );
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
      // 시군구는 그 시도 안에 실제로 있는 것만 받는다. 없는 값이면 버리고 시도 전체로 둔다
      const districts = availableDistricts.get(parsed.region) ?? [];
      if (parsed.district && districts.some((d) => d.slug === parsed.district)) {
        setAppliedDistrict(parsed.district);
        setStagedDistrict(parsed.district);
      }
    }
  }, [searchParams, topicTree, tagGroups, availableCities, availableDistricts]);

  // ── 파생 ──
  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedTagGroupKeys.length > 0 || appliedRegion !== null;
  const hasPostLevelFilter = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedTagGroupKeys.length > 0;

  // ── 핸들러 ──
  function commitFilters(next: FilterState) {
    setAppliedTopicIds(next.topicIds);
    setAppliedTagIds(next.tagIds);
    setAppliedTagGroupKeys(next.tagGroupKeys);
    setAppliedRegion(next.region);
    setAppliedDistrict(next.district);
    const params = serializeFilterParams(next, { topicTree, tagGroups }, new URLSearchParams(searchParams.toString()));
    // 결과에서 사라지는 선택은 필터 파라미터와 같은 replace 에서 함께 지운다.
    // 별도 replace 로 나누면 그쪽이 읽는 searchParams 에는 방금 쓴 필터가 아직 없어 URL 에서 필터가 날아간다
    if (!shouldKeepSelectedPlace(next)) params.delete("place");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const exitResultMode = () => {
    onExitQuery();
    commitFilters({ topicIds: [], tagIds: [], tagGroupKeys: [], region: null, district: null });
  };

  const openFilter = () => {
    setStagedTopicIds(appliedTopicIds);
    setStagedTagIds(appliedTagIds);
    setStagedTagGroupKeys(appliedTagGroupKeys);
    setStagedRegion(appliedRegion);
    setStagedDistrict(appliedDistrict);
    setIsFilterOpen(true);
  };
  const applyFilters = () => {
    commitFilters({ topicIds: stagedTopicIds, tagIds: stagedTagIds, tagGroupKeys: stagedTagGroupKeys, region: stagedRegion, district: stagedDistrict });
    setIsFilterOpen(false);
    onFiltersApplied();
  };
  const closeFilter = () => setIsFilterOpen(false);
  const resetStaged = () => { setStagedTopicIds([]); setStagedTagIds([]); setStagedTagGroupKeys([]); setStagedRegion(null); setStagedDistrict(null); };
  const removeAppliedTopic = (id: string) =>
    commitFilters({ topicIds: appliedTopicIds.filter((x) => x !== id), tagIds: appliedTagIds, tagGroupKeys: appliedTagGroupKeys, region: appliedRegion, district: appliedDistrict });
  const removeAppliedTag = (id: string) =>
    commitFilters({ topicIds: appliedTopicIds, tagIds: appliedTagIds.filter((x) => x !== id), tagGroupKeys: appliedTagGroupKeys, region: appliedRegion, district: appliedDistrict });
  const removeAppliedTagGroup = (key: string) =>
    commitFilters({ topicIds: appliedTopicIds, tagIds: appliedTagIds, tagGroupKeys: appliedTagGroupKeys.filter((k) => k !== key), region: appliedRegion, district: appliedDistrict });

  // 그룹(L0/L1) All 토글 — staged에 groupId가 있으면 그것만 제거, 없으면 하위 노드(descendantIds) 전부 제거 후 groupId 추가(collapse)
  const toggleTopicGroup = (groupId: string, descendantIds: string[]) =>
    setStagedTopicIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((x) => x !== groupId)
        : [...prev.filter((x) => !descendantIds.includes(x)), groupId]
    );
  // coveringGroupId가 주어지고 staged에 있으면 degrade(그룹 해제 + 방금 누른 id를 뺀 나머지 칩 개별 선택), 아니면 단순 토글
  const toggleTopic = (id: string, coveringGroupId?: string, chipIds?: string[]) =>
    setStagedTopicIds((prev) => {
      if (coveringGroupId && chipIds && prev.includes(coveringGroupId)) {
        return [...prev.filter((x) => x !== coveringGroupId), ...chipIds.filter((cid) => cid !== id)];
      }
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  // 태그 그룹 All 토글 — stagedTagGroupKeys에 groupKey 있으면 그것만 제거, 없으면 memberTagIds를 stagedTagIds에서 제거 후 groupKey 추가(collapse)
  const toggleTagGroup = (groupKey: string, memberTagIds: string[]) => {
    if (stagedTagGroupKeys.includes(groupKey)) {
      setStagedTagGroupKeys((prev) => prev.filter((k) => k !== groupKey));
      return;
    }
    // 순서 고정: setStagedTagIds → setStagedTagGroupKeys
    setStagedTagIds((prev) => prev.filter((x) => !memberTagIds.includes(x)));
    setStagedTagGroupKeys((prev) => [...prev, groupKey]);
  };
  // coveringGroupKey가 주어지고 stagedTagGroupKeys에 있으면 degrade(그룹 해제 + 방금 누른 id를 뺀 나머지 멤버 태그 개별 선택), 아니면 단순 토글
  const toggleTag = (id: string, coveringGroupKey?: string, memberTagIds?: string[]) => {
    if (coveringGroupKey && memberTagIds && stagedTagGroupKeys.includes(coveringGroupKey)) {
      setStagedTagGroupKeys((prev) => prev.filter((k) => k !== coveringGroupKey));
      setStagedTagIds((prev) => [...prev, ...memberTagIds.filter((tid) => tid !== id)]);
      return;
    }
    setStagedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  // 시도를 바꾸거나 끄면 시군구는 따라 내려간다 — 다른 시도의 구가 남으면 결과가 0이 된다
  const toggleRegion = (slug: string) => {
    setStagedRegion((prev) => prev === slug ? null : slug);
    setStagedDistrict(null);
  };
  // 시군구는 단일 선택. 같은 값 재탭이면 해제 (region 과 같은 방식)
  const toggleDistrict = (slug: string) =>
    setStagedDistrict((prev) => prev === slug ? null : slug);

  return {
    isFilterOpen,
    stagedTopicIds,
    stagedTagIds,
    stagedTagGroupKeys,
    stagedRegion,
    stagedDistrict,
    appliedTopicIds,
    appliedTagIds,
    appliedTagGroupKeys,
    appliedRegion,
    appliedDistrict,
    hasFilters,
    hasPostLevelFilter,
    availableCities,
    availableDistricts,
    topicChipMap,
    tagChipMap,
    tagGroupChipMap,
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
    toggleTopicGroup,
    toggleTag,
    toggleTagGroup,
    toggleRegion,
    toggleDistrict,
  };
}
