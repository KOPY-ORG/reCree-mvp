"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, Maximize } from "lucide-react";
import { useToast } from "../../_hooks/useToast";
import { dedupeEventMarkers } from "@/lib/event-utils";
import { EVENT_RED, getDDay, sortEventMarkers } from "@/lib/event-format";
import { useSearchParams, useRouter } from "next/navigation";
import { InteractiveMap, type FocusCameraHandle } from "@/components/maps/InteractiveMap";
import { PlaceBottomSheet } from "@/components/maps/PlaceBottomSheet";
import { PlaceListSheet, getSheetHeight, type PlaceListSheetState } from "@/components/maps/PlaceListSheet";
import { PlaceListSheetCard } from "@/components/maps/PlaceListSheetCard";
import { EventListCard } from "@/components/maps/EventListCard";
import { DiscoverSearchBar } from "./DiscoverSearchBar";
import { EventSearchBar } from "./EventSearchBar";
import { DiscoverFilterSheet } from "./DiscoverFilterSheet";
import { DiscoverActiveFacets } from "./DiscoverActiveFacets";
import { DiscoverSheetHeader } from "./DiscoverSheetHeader";
import { EventSheetHeader } from "./EventSheetHeader";
import { EventPeekCarousel } from "./EventPeekCarousel";
import { HotTabStub } from "./HotTabStub";
import { ScrollToTopButton } from "../../_components/ScrollToTopButton";
import { useRecentSearches } from "../_hooks/useRecentSearches";
import { useDiscoverViewState } from "../_hooks/useDiscoverViewState";
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { getTopicMarkerColor, getTopicMarkerGradient, topicMatchesFilter, matchesQuery } from "@/lib/map-utils";
import { getPlaceRegionSlug, getPlaceRegionLabel } from "@/lib/region-utils";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { Level0TopicDeep } from "@/lib/topic-queries";
import type { TagGroupWithTags } from "@/lib/filter-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import type {
  ActiveEventCollection,
  EventCollectionForMap,
  EventCollectionMapMarker,
} from "@/lib/event-collection-queries";

type ChipInfo = { id: string; label: string; bg: string; fg: string };
const KPOP_NAME = "K-POP";
const CATEGORY_ORDER: string[] = [
  "CONCERT", "LANDMARK_LIGHTING", "PROMOTION", "ACTIVITY",
  "SHOPPING", "MOBILITY", "FNB", "STAY", "WELCOME_KIT",
];

function calcEventPassesFilter(
  e: { marker: EventCollectionMapMarker; placeIds: string[] },
  opts: { query: string; category: string | null; savedOnly: boolean; savedSet: Set<string> }
): boolean {
  const matchesSearch =
    !opts.query.trim() ||
    matchesQuery(e.marker.nameEn, opts.query) ||
    matchesQuery(e.marker.place?.nameEn, opts.query);
  const matchesCategory = !opts.category || e.marker.category === opts.category;
  const matchesSaved = !opts.savedOnly || opts.savedSet.has(e.marker.eventId);
  return matchesSearch && matchesCategory && matchesSaved;
}

function postMatchesFilters(post: MapPost, topicIds: string[], tagIds: string[]): boolean {
  const topicHit =
    topicIds.length > 0 &&
    post.topics.some((t) => topicIds.some((id) => topicMatchesFilter(t, id)));
  const tagHit = tagIds.length > 0 && post.tags.some((tag) => tagIds.includes(tag.id));
  return topicHit || tagHit;
}

function placeMatchesFilters(
  place: Pick<MapPlace, "posts" | "area">,
  topicIds: string[],
  tagIds: string[],
  region: string | null
): boolean {
  if (region !== null && getPlaceRegionSlug(place.area) !== region) return false;
  if (topicIds.length === 0 && tagIds.length === 0) return true;
  return place.posts.some((post) => postMatchesFilters(post, topicIds, tagIds));
}

// 토픽 매칭은 항상 태그보다 위. 같은 급 안에서는 먼저 선택한 필터 기준.
// 합산이 아닌 "가장 먼저 선택된 매칭"의 index만 사용해 선택 순서가 다중 매칭 누적에 묻히지 않도록.
const TOPIC_BASE = 1000;
const TAG_BASE = 1;
function placeMatchScore(
  place: Pick<MapPlace, "posts">,
  topicIds: string[],
  tagIds: string[]
): number {
  const bestTopicIdx = topicIds.findIndex((id) =>
    place.posts.some((post) => post.topics.some((t) => topicMatchesFilter(t, id)))
  );
  if (bestTopicIdx !== -1) return TOPIC_BASE + (topicIds.length - bestTopicIdx);

  const bestTagIdx = tagIds.findIndex((id) =>
    place.posts.some((post) => post.tags.some((tag) => tag.id === id))
  );
  if (bestTagIdx !== -1) return TAG_BASE + (tagIds.length - bestTagIdx);

  return 0;
}

type DiscoverSuggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; placeName: string; placeId: string };

/** topicChipMap과 동일한 chip 레벨 결정 로직으로 slug → id 반환 */
function findTopicIdBySlug(topicTree: Level0TopicDeep[], slug: string): string | null {
  for (const root of topicTree) {
    const l1s = root.children;
    if (l1s.length === 0) continue;
    if (root.nameEn === KPOP_NAME) {
      for (const l1 of l1s)
        for (const l2 of l1.children)
          if (l2.slug === slug) return l2.id;
      continue;
    }
    const hasL2 = l1s.some((l1) => l1.children.length > 0);
    if (!hasL2) {
      for (const l1 of l1s)
        if (l1.slug === slug) return l1.id;
    } else {
      for (const l1 of l1s)
        for (const l2 of l1.children)
          if (l2.slug === slug) return l2.id;
    }
  }
  return null;
}

function findTagIdBySlug(tagGroups: TagGroupWithTags[], slug: string): string | null {
  for (const group of tagGroups)
    for (const tag of group.tags)
      if (tag.slug === slug) return tag.id;
  return null;
}

interface Props {
  allPlaces: (MapPlace & { isSaved?: boolean })[];
  savedPostIds: string[];
  savedEventIds?: string[];
  tagGroups: TagGroupWithTags[];
  topicTree: Level0TopicDeep[];
  isLoggedIn: boolean;
  eventCollections?: ActiveEventCollection[];
  eventMapData?: Record<string, EventCollectionForMap | null>;
}

export function ExploreMapView({ allPlaces, savedPostIds, savedEventIds = [], tagGroups, topicTree, isLoggedIn, eventCollections = [], eventMapData = {} }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSavedView = searchParams.get("saved") === "1";
  const selectedPlaceId = searchParams.get("place");
  const collectionSlug = searchParams.get("collection");

  const [sheetState, setSheetState] = useState<PlaceListSheetState>(
    selectedPlaceId ? "hidden" : "half"
  );
  const [focusedPlaceIds, setFocusedPlaceIds] = useState<Set<string>>(new Set());
  const [contentTab, setContentTab] = useState<"hot" | "list">("hot");
  const [query, setQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [stagedTopicIds, setStagedTopicIds] = useState<string[]>([]);
  const [stagedTagIds, setStagedTagIds] = useState<string[]>([]);
  const [stagedRegion, setStagedRegion] = useState<string | null>(null);
  const [appliedTopicIds, setAppliedTopicIds] = useState<string[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<string[]>([]);
  const [appliedRegion, setAppliedRegion] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast, showToast } = useToast();
  const mapRef = useRef<FocusCameraHandle>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const listScrollMemoRef = useRef<number>(0);
  const urlFilterInitRef = useRef(false);
  const { recents, addRecent, removeRecent, clearRecents } = useRecentSearches();
  const { restored, save, clear } = useDiscoverViewState();

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

  useEffect(() => {
    if (!restored) return;
    setQuery(restored.query);
    setContentTab(restored.contentTab);
    clear();
    const top = restored.scrollTop;
    if (top > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (listScrollRef.current) listScrollRef.current.scrollTop = top;
        });
      });
    }
  }, [restored, clear]);

  // URL ?topic=<slug> / ?tag=<slug> / ?region=<slug> → 마운트 1회 초기 필터 적용
  useEffect(() => {
    if (urlFilterInitRef.current) return;
    urlFilterInitRef.current = true;
    const topicSlug = searchParams.get("topic");
    const tagSlug = searchParams.get("tag");
    const regionSlug = searchParams.get("region");
    if (topicSlug) {
      const id = findTopicIdBySlug(topicTree, topicSlug);
      if (id) setAppliedTopicIds([id]);
    }
    if (tagSlug) {
      const id = findTagIdBySlug(tagGroups, tagSlug);
      if (id) setAppliedTagIds([id]);
    }
    if (regionSlug && availableCities.some((c) => c.slug === regionSlug)) {
      setAppliedRegion(regionSlug);
    }
  }, [searchParams, topicTree, tagGroups, availableCities]);

  // 컬렉션 진입/변경/종료 시 이벤트 검색·카테고리·북마크 초기화
  useEffect(() => {
    setEventQuery("");
    setSelectedCategory(null);
    setSavedOnly(false);
  }, [collectionSlug]);

  const handlePostNavigate = () => {
    save({ query, contentTab, scrollTop: listScrollRef.current?.scrollTop ?? 0 });
  };

  const handleContentTabChange = (tab: "hot" | "list") => {
    if (contentTab === "list" && listScrollRef.current) {
      listScrollMemoRef.current = listScrollRef.current.scrollTop;
    }
    setContentTab(tab);
  };

  useEffect(() => {
    if (contentTab !== "list") return;
    const top = listScrollMemoRef.current;
    if (top > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (listScrollRef.current) listScrollRef.current.scrollTop = top;
        });
      });
    }
  }, [contentTab]);

  function setSelectedPlaceId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("place", id);
    } else {
      params.delete("place");
    }
    router.replace(`?${params.toString()}`);
  }

  function setCollectionSlug(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("collection", slug);
      params.delete("place"); // 진입 시 기존 place 선택 초기화
      setFocusedPlaceIds(new Set());
      setSheetState("half");
    } else {
      params.delete("collection");
      params.delete("place");
    }
    router.replace(`?${params.toString()}`);
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast("Location is not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        mapRef.current?.focusCamera(coords);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED)
          showToast("Location permission denied. Enable it in your browser settings.");
        else if (err.code === err.POSITION_UNAVAILABLE)
          showToast("Couldn't determine your location");
        else if (err.code === err.TIMEOUT)
          showToast("Location request timed out. Try again.");
        else
          showToast("Something went wrong getting your location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleMarkerClick = (placeId: string) => {
    // 좌표를 직접 조회해 즉시 카메라 이동 — URL/state 갱신 타이밍 경유 금지
    const place =
      (isEventMode ? visibleEventMarkers : filteredPlaces).find((p) => p.id === placeId) ??
      eventMarkerPlaces.find((p) => p.id === placeId);
    if (place) mapRef.current?.focusCamera({ lat: place.latitude, lng: place.longitude });
    setFocusedPlaceIds(new Set());
    setSelectedPlaceId(placeId);
  };

  const handlePlaceClose = () => {
    setSelectedPlaceId(null);
  };

  const handleCardTap = (placeIds: string[]) => {
    const same =
      focusedPlaceIds.size === placeIds.length &&
      placeIds.every((id) => focusedPlaceIds.has(id));
    if (same) {
      setFocusedPlaceIds(new Set());
      return;
    }
    setSelectedPlaceId(null);
    setFocusedPlaceIds(new Set(placeIds));
    setSheetState((prev) => (prev === "full" ? "half" : prev));
  };

  const handleMapClick = () => {
    setSelectedPlaceId(null);
    setFocusedPlaceIds(new Set());
  };

  const selectedPlace = allPlaces.find((p) => p.id === selectedPlaceId) ?? null;

  const savedPostIdsSet = useMemo(() => new Set(savedPostIds), [savedPostIds]);
  const savedEventIdsSet = useMemo(() => new Set(savedEventIds), [savedEventIds]);
  const tagGroupMap = useMemo(
    () => new Map(tagGroups.map((c) => [c.group, c])) as TagGroupColorMap,
    [tagGroups]
  );

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

  const btsTopicId = useMemo(() => findTopicIdBySlug(topicTree, "bts"), [topicTree]);
  const btsChipInfo = useMemo(
    () => (btsTopicId ? (topicChipMap.get(btsTopicId) ?? null) : null),
    [btsTopicId, topicChipMap]
  );

  const markerPlaces = useMemo(
    () => allPlaces.map((p) => ({
      ...p,
      markerColor: getTopicMarkerColor(p.posts),
      markerGradient: getTopicMarkerGradient(p.posts),
    })),
    [allPlaces]
  );

  const visiblePlaces = useMemo(
    () => (isSavedView ? markerPlaces.filter((p) => p.isSaved) : markerPlaces),
    [isSavedView, markerPlaces]
  );

  // isResultMode보다 먼저 선언해야 참조 가능
  const activeEventData = useMemo(
    () =>
      collectionSlug !== null && eventMapData
        ? (eventMapData[collectionSlug] ?? null)
        : null,
    [collectionSlug, eventMapData]
  );
  const isEventMode = activeEventData !== null;

  const hasFilters = appliedTopicIds.length > 0 || appliedTagIds.length > 0 || appliedRegion !== null;
  const isResultMode = !isEventMode && (query.trim() !== "" || hasFilters);
  const hasRegionChips = !isEventMode && availableCities.length >= 2;
  // 이벤트 모드는 EventSearchBar(검색+칩)가 항상 떠 있어 동일한 top reserve가 필요.
  // 비이벤트는 facet 칩이 떠 있을 때(isResultMode)만 필요. 두 조건의 OR는 새 변수에서만.
  const needsTopReserve = isEventMode || isResultMode || hasRegionChips;

  const searchedPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visiblePlaces;
    return visiblePlaces.filter((place) => {
      const inName =
        place.nameEn?.toLowerCase().includes(q) ||
        place.nameKo?.toLowerCase().includes(q);
      const inPost = place.posts.some((post) =>
        post.titleEn?.toLowerCase().includes(q)
      );
      const inTopic = place.posts.some((post) =>
        post.topics.some((t) => t.nameEn?.toLowerCase().includes(q))
      );
      return Boolean(inName || inPost || inTopic);
    });
  }, [query, visiblePlaces]);

  const filteredPlaces = useMemo(() => {
    if (!hasFilters) return searchedPlaces;
    const matched = searchedPlaces.filter((p) =>
      placeMatchesFilters(p, appliedTopicIds, appliedTagIds, appliedRegion)
    );
    return [...matched].sort(
      (a, b) =>
        placeMatchScore(b, appliedTopicIds, appliedTagIds) -
        placeMatchScore(a, appliedTopicIds, appliedTagIds)
    );
  }, [searchedPlaces, hasFilters, appliedTopicIds, appliedTagIds, appliedRegion]);

  const suggestions = useMemo((): DiscoverSuggestion[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // 토픽 keyword: q 포함하는 nameEn 수집, 대소문자 무시 dedupe, 최대 3개
    const seenTopics = new Set<string>();
    const keywordSuggestions: DiscoverSuggestion[] = [];
    outer: for (const place of visiblePlaces) {
      for (const post of place.posts) {
        for (const t of post.topics) {
          if (!t.nameEn?.toLowerCase().includes(q)) continue;
          const key = t.nameEn.toLowerCase();
          if (seenTopics.has(key)) continue;
          seenTopics.add(key);
          keywordSuggestions.push({ type: "keyword", text: t.nameEn });
          if (keywordSuggestions.length >= 3) break outer;
        }
      }
    }

    // 장소 post: 매칭 place당 첫 번째 매칭 post, 최대 7개
    const postSuggestions: DiscoverSuggestion[] = [];
    for (const place of visiblePlaces) {
      const inName =
        place.nameEn?.toLowerCase().includes(q) ||
        place.nameKo?.toLowerCase().includes(q);
      const matchingPost = place.posts.find(
        (post) =>
          post.titleEn?.toLowerCase().includes(q) ||
          post.topics.some((t) => t.nameEn?.toLowerCase().includes(q))
      );
      if (!inName && !matchingPost) continue;
      const post = matchingPost ?? place.posts[0];
      if (!post?.titleEn) continue;
      postSuggestions.push({ type: "post", text: post.titleEn, placeName: place.nameEn, placeId: place.id });
      if (postSuggestions.length >= 7) break;
    }

    return [...keywordSuggestions, ...postSuggestions];
  }, [query, visiblePlaces]);

  const allVisiblePosts = useMemo(() => {
    const ts = (p: MapPost) =>
      new Date(p.publishedAt ?? p.createdAt).getTime();

    // 그룹 내 최신 post 시각 기준 place desc 정렬
    const sortedPlaces = [...filteredPlaces].sort((pa, pb) => {
      const maxA = Math.max(...pa.posts.map(ts));
      const maxB = Math.max(...pb.posts.map(ts));
      return maxB - maxA;
    });

    // 그룹 순서 유지, 그룹 내부 최신순 + post.id 전역 dedupe
    const seen = new Set<string>();
    return sortedPlaces.flatMap((place) =>
      [...place.posts]
        .sort((a, b) => ts(b) - ts(a))
        .filter((post) => {
          if (seen.has(post.id)) return false;
          seen.add(post.id);
          return true;
        })
        .map((post) => ({ post, place }))
    );
  }, [filteredPlaces]);

  // ── 이벤트 모드 파생 (계속) ──────────────────────────────────────────────────

  const events: EventCollectionMapMarker[] = useMemo(
    () => activeEventData?.markers ?? [],
    [activeEventData]
  );

  // eventId 기준 dedupe — 카드 1개/이벤트, 복수 장소 placeIds 보유
  const dedupedEvents = useMemo(() => sortEventMarkers(dedupeEventMarkers(events)), [events]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(dedupedEvents.map((e) => e.marker.category));
    return CATEGORY_ORDER.filter((cat) => set.has(cat));
  }, [dedupedEvents]);

  const filteredEvents = useMemo(() => {
    if (!eventQuery.trim() && !selectedCategory && !savedOnly) return dedupedEvents;
    return dedupedEvents.filter((e) =>
      calcEventPassesFilter(e, { query: eventQuery, category: selectedCategory, savedOnly, savedSet: savedEventIdsSet })
    );
  }, [dedupedEvents, eventQuery, selectedCategory, savedOnly, savedEventIdsSet]);

  const eventsByPlace = useMemo(() => {
    const map: Record<string, EventCollectionMapMarker[]> = {};
    for (const event of events) {
      const pid = event.place.id;
      if (!map[pid]) map[pid] = [];
      map[pid].push(event);
    }
    return map;
  }, [events]);

  const eventPlaces = useMemo(() => {
    const seen = new Set<string>();
    return events
      .filter((e) => {
        if (seen.has(e.place.id)) return false;
        seen.add(e.place.id);
        return true;
      })
      .map((e) => e.place);
  }, [events]);

  const eventMarkerPlaces = useMemo(
    () =>
      eventPlaces.map((place) => ({
        id: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        nameEn: place.nameEn,
        markerColor: EVENT_RED,
        markerGradient: undefined,
        isSaved: eventsByPlace[place.id]?.some((e) => savedEventIdsSet.has(e.eventId)) ?? false,
        postCount: eventsByPlace[place.id]?.length ?? 0,
        showLabel: false,
        invertOnSelect: true,
      })),
    [eventPlaces, eventsByPlace, savedEventIdsSet]
  );

  const visibleEventMarkers = useMemo(() => {
    if (!eventQuery.trim() && !selectedCategory && !savedOnly) return eventMarkerPlaces;
    const matchedPlaceIds = new Set(
      dedupedEvents
        .filter((e) => calcEventPassesFilter(e, { query: eventQuery, category: selectedCategory, savedOnly, savedSet: savedEventIdsSet }))
        .flatMap((e) => e.placeIds)
    );
    return eventMarkerPlaces.filter((m) => matchedPlaceIds.has(m.id));
  }, [eventMarkerPlaces, dedupedEvents, eventQuery, selectedCategory, savedOnly, savedEventIdsSet]);

  const handleSearchOpen = () => {
    setSelectedPlaceId(null);
    setIsSearchOpen(true);
  };
  const handleSelectTerm = (trimmed: string) => {
    setSelectedPlaceId(null);
    setQuery(trimmed);
    addRecent(trimmed);
    setIsSearchOpen(false);
    setSheetState("half");
  };
  const handleSelectPlace = (placeId: string) => {
    setIsSearchOpen(false);
    handleMarkerClick(placeId);
  };
  const handleClearQuery = () => setQuery("");

  function fitEventMarkers(opts: { query: string; category: string | null; savedOnly: boolean; savedSet: Set<string> }) {
    const matchedPlaceIds = new Set(
      dedupedEvents
        .filter((e) => calcEventPassesFilter(e, opts))
        .flatMap((e) => e.placeIds)
    );
    const coords = eventMarkerPlaces
      .filter((m) => matchedPlaceIds.has(m.id))
      .map((m) => ({ lat: m.latitude, lng: m.longitude }));
    mapRef.current?.fitMarkers(coords);
  }

  // 칩 탭 → state 갱신 + 카메라 즉시 이동 (next 직접 계산, effect 경유 없음)
  function handleCategorySelect(next: string | null) {
    setSelectedCategory(next);
    fitEventMarkers({ query: eventQuery, category: next, savedOnly, savedSet: savedEventIdsSet });
  }

  function handleSavedToggle() {
    if (!isLoggedIn) {
      showToast("Sign in to view saved events");
      return;
    }
    const next = !savedOnly;
    setSavedOnly(next);
    fitEventMarkers({ query: eventQuery, category: selectedCategory, savedOnly: next, savedSet: savedEventIdsSet });
  }

  const exitResultMode = () => {
    setQuery("");
    setAppliedTopicIds([]);
    setAppliedTagIds([]);
    setAppliedRegion(null);
  };

  const openFilter = () => {
    setStagedTopicIds(appliedTopicIds);
    setStagedTagIds(appliedTagIds);
    setStagedRegion(appliedRegion);
    setIsFilterOpen(true);
  };
  const applyFilters = () => {
    setAppliedTopicIds(stagedTopicIds);
    setAppliedTagIds(stagedTagIds);
    setAppliedRegion(stagedRegion);
    setIsFilterOpen(false);
    setSheetState("half");
  };
  const resetStaged = () => { setStagedTopicIds([]); setStagedTagIds([]); setStagedRegion(null); };
  const removeAppliedTopic = (id: string) =>
    setAppliedTopicIds((prev) => prev.filter((x) => x !== id));
  const removeAppliedTag = (id: string) =>
    setAppliedTagIds((prev) => prev.filter((x) => x !== id));

  const toggleTopic = (id: string) =>
    setStagedTopicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleTag = (id: string) =>
    setStagedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleRegion = (slug: string) =>
    setStagedRegion((prev) => prev === slug ? null : slug);

  const effectiveSheetState = selectedPlaceId
    ? "hidden"
    : sheetState === "hidden"
      ? "tab-only"
      : sheetState;

  // FAB bottom 계산용 — tabOnlyH는 측정값 근사(80), fullTop은 PlaceListSheet와 동일 공식
  const fabSheetH = getSheetHeight(effectiveSheetState, 80, needsTopReserve ? 96 : 64);

  return (
    // bottomnav(h-16=64px) — ExploreHeader 제거됨
    <div className="relative h-[calc(100dvh-64px)] overflow-hidden">
      <InteractiveMap
        ref={mapRef}
        places={isEventMode ? visibleEventMarkers : filteredPlaces}
        selectedPlaceId={selectedPlaceId}
        focusedPlaceIds={focusedPlaceIds}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        boundsKey={
          isEventMode
            ? `collection:${collectionSlug}`
            : isResultMode
              ? `q:${query}|t:${[...appliedTopicIds].sort().join(",")}|g:${[...appliedTagIds].sort().join(",")}|r:${appliedRegion ?? ""}`
              : isSavedView ? "saved" : "all"
        }
        highlightedIds={
          isResultMode ? new Set(filteredPlaces.map((p) => p.id)) : undefined
        }
        userLocation={userLocation}
        className="absolute inset-0"
      />
      {!isEventMode && (
        <DiscoverSearchBar
          isLoggedIn={isLoggedIn}
          query={query}
          isOpen={isSearchOpen}
          onOpen={handleSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onFilterOpen={openFilter}
          onQueryChange={setQuery}
          onClearQuery={handleClearQuery}
          suggestions={suggestions}
          recents={recents}
          onSelectTerm={handleSelectTerm}
          onSelectPlace={handleSelectPlace}
          onRemoveRecent={removeRecent}
          onClearRecents={clearRecents}
        />
      )}

      {isEventMode && (
        <EventSearchBar
          query={eventQuery}
          onQueryChange={setEventQuery}
          onClear={() => setEventQuery("")}
          onExit={() => setCollectionSlug(null)}
          availableCategories={availableCategories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          savedOnly={savedOnly}
          onSavedToggle={handleSavedToggle}
        />
      )}

      {!isEventMode && effectiveSheetState !== "full" && (
        <DiscoverActiveFacets
          query={query}
          appliedTopicIds={appliedTopicIds}
          appliedTagIds={appliedTagIds}
          topicChipMap={topicChipMap}
          tagChipMap={tagChipMap}
          onClearQuery={handleClearQuery}
          onRemoveTopic={removeAppliedTopic}
          onRemoveTag={removeAppliedTag}
          eventCollections={eventCollections}
          onEventCollectionClick={(slug) => setCollectionSlug(slug)}
          quickTopicChip={btsChipInfo}
          onQuickTopicClick={() => {
            if (btsTopicId) setAppliedTopicIds([btsTopicId]);
          }}
          regions={availableCities}
          appliedRegion={appliedRegion}
          onRegionChange={setAppliedRegion}
        />
      )}

      {/* 기본 리스트 시트 — z-40 */}
      <PlaceListSheet
        state={effectiveSheetState}
        onStateChange={setSheetState}
        topOffset={64}
        hasActiveFacets={needsTopReserve}
        scrollContainerRef={listScrollRef}
        header={
          isEventMode && activeEventData ? (
            <EventSheetHeader
              collectionName={activeEventData.collection.nameEn}
              eventCount={filteredEvents.length}
            />
          ) : (
            <DiscoverSheetHeader
              contentTab={contentTab}
              onContentTabChange={handleContentTabChange}
              placeCount={filteredPlaces.length}
              isResultMode={isResultMode}
              isSavedView={isSavedView}
              query={query}
              onExitResultMode={exitResultMode}
            />
          )
        }
      >
        {isEventMode ? (
          filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-sm font-semibold text-foreground">No events available</p>
            </div>
          ) : (
            <div className="px-4 pt-2 pb-4 space-y-2">
              {filteredEvents.map((ec) => (
                <EventListCard
                  key={ec.marker.eventId}
                  event={ec.marker}
                  collectionName={activeEventData!.collection.nameEn}
                  collectionSlug={collectionSlug!}
                  placeCount={ec.placeIds.length}
                  isSelected={ec.placeIds.some((id) => focusedPlaceIds.has(id))}
                  isSaved={savedEventIdsSet.has(ec.marker.eventId)}
                  notchBg="#F4F5F7"
                  onSelect={() => handleCardTap(ec.placeIds)}
                  onViewMap={() => {
                    setSelectedPlaceId(ec.placeIds[0]);
                  }}
                />
              ))}
            </div>
          )
        ) : (contentTab === "list" || isResultMode || isSavedView) ? (
          allVisiblePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-sm font-semibold text-foreground">
                {isSavedView ? "No saved places yet" : "No places match your filters"}
              </p>
              {!isSavedView && <p className="text-xs text-muted-foreground mt-1.5">Try removing a filter.</p>}
            </div>
          ) : (
            <div className="px-4 pt-2 pb-4 space-y-2">
              {allVisiblePosts.map(({ post, place }) => (
                <PlaceListSheetCard
                  key={post.id}
                  post={post}
                  place={place}
                  isSaved={savedPostIdsSet.has(post.id)}
                  isFocused={focusedPlaceIds.has(place.id)}
                  tagGroupMap={tagGroupMap}
                  matchedTopicIds={appliedTopicIds}
                  onCardTap={(placeId) => handleCardTap([placeId])}
                  onViewPlace={handleSelectPlace}
                  onPostNavigate={handlePostNavigate}
                />
              ))}
            </div>
          )
        ) : (
          <HotTabStub eventCollections={eventCollections} eventMapData={eventMapData} />
        )}
      </PlaceListSheet>

      {/* 리스트 맨 위로 버튼 — z-30, 시트 위에 absolute */}
      <ScrollToTopButton scrollRef={listScrollRef} />

      {/* FAB 그룹 — 시트 상단 위 12px에 붙어서 이동, 선택 중이거나 full이면 둘 다 숨김 */}
      {!selectedPlaceId && (
        <div
          className={`absolute right-3 z-[45] flex flex-col gap-3 ${
            effectiveSheetState === "full" ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{ bottom: `calc(${fabSheetH} + 12px)`, transition: "bottom 300ms ease, opacity 300ms ease" }}
        >
          {/* 현위치 버튼 */}
          <button
            type="button"
            aria-label="My location"
            onClick={handleLocateMe}
            disabled={locating}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:opacity-70 transition-opacity disabled:opacity-50"
          >
            {locating ? (
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            ) : (
              <LocateFixed size={16} strokeWidth={2} />
            )}
          </button>
          {/* 전체 보기 버튼 */}
          <button
            type="button"
            aria-label="Fit all markers"
            onClick={() => mapRef.current?.fitAllMarkers()}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:opacity-70 transition-opacity"
          >
            <Maximize size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* floating 카드 — z-50: 이벤트 모드=캐러셀, 일반 모드=장소 상세 */}
      {isEventMode && selectedPlaceId && activeEventData ? (
        <EventPeekCarousel
          events={eventsByPlace[selectedPlaceId] ?? []}
          collectionSlug={collectionSlug!}
          collectionName={activeEventData.collection.nameEn}
          savedEventIds={savedEventIds}
          onClose={handlePlaceClose}
        />
      ) : !isEventMode ? (
        <PlaceBottomSheet
          place={selectedPlace}
          savedPostIds={savedPostIdsSet}
          tagGroupMap={tagGroupMap}
          onClose={handlePlaceClose}
        />
      ) : null}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}

      {/* 필터 시트 — z-[65] */}
      <DiscoverFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        topicTree={topicTree}
        tagGroups={tagGroups}
        topicChipMap={topicChipMap}
        tagChipMap={tagChipMap}
        stagedTopicIds={stagedTopicIds}
        stagedTagIds={stagedTagIds}
        onToggleTopic={toggleTopic}
        onToggleTag={toggleTag}
        onReset={resetStaged}
        onApply={applyFilters}
        regions={availableCities}
        stagedRegion={stagedRegion}
        onToggleRegion={toggleRegion}
      />
    </div>
  );
}
