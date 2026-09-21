"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, LocateFixed, Maximize, Route } from "lucide-react";
import { useToast } from "../../_hooks/useToast";
import { dedupeEventMarkers } from "@/lib/event-utils";
import { EVENT_RED, sortEventMarkers } from "@/lib/event-format";
import { useSearchParams, useRouter } from "next/navigation";
import { buildTopicColorMap } from "@/lib/filter-params";
import type { FilterState } from "@/lib/filter-params";
import { postMatchesFilters, placeMatchesFilters, placeMatchScore } from "@/lib/discover-filter-utils";
import { InteractiveMap, type FocusCameraHandle } from "@/components/maps/InteractiveMap";
import { PlaceBottomSheet } from "@/components/maps/PlaceBottomSheet";
import { PlaceListSheet, getSheetHeight, type PlaceListSheetState } from "@/components/maps/PlaceListSheet";
import { PlaceListSheetCard } from "@/components/maps/PlaceListSheetCard";
import { EventListCard } from "@/components/maps/EventListCard";
import { DiscoverSearchBar } from "./DiscoverSearchBar";
import { EventSearchBar } from "./EventSearchBar";
import { DiscoverFilterSheet } from "./DiscoverFilterSheet";
import { DiscoverActiveFacets } from "./DiscoverActiveFacets";
import { DiscoverSheetHeader, CATEGORY_CHIP_ROW_HEIGHT } from "./DiscoverSheetHeader";
import { DiscoverTopicChips } from "./DiscoverTopicChips";
import type { TabTopic } from "@/app/(user)/feed/_components/HomeTabBar";
import { PLACE_CATEGORY_CHIPS, placeCategories, type PlaceCategoryChip } from "@/lib/place-types";
import { getPlaceRegionSlug } from "@/lib/region-utils";
import { EventSheetHeader } from "./EventSheetHeader";
import { EventPeekCarousel } from "./EventPeekCarousel";
import { DiscoverSections } from "./DiscoverSections";
import { NearHereSection, type RoundedCenter } from "./NearHereSection";
import { ScrollToTopButton } from "../../_components/ScrollToTopButton";
import { useRecentSearches } from "../_hooks/useRecentSearches";
import { useDiscoverViewState } from "../_hooks/useDiscoverViewState";
import { useDiscoverFilters } from "../_hooks/useDiscoverFilters";
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { getTopicMarkerColor, getTopicMarkerGradient, topicMatchesFilter, matchesQuery } from "@/lib/map-utils";
import type { Level0TopicDeep } from "@/lib/topic-queries";
import type { TagGroupWithTags } from "@/lib/filter-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import type {
  ActiveEventCollection,
  EventCollectionForMap,
  EventCollectionMapMarker,
} from "@/lib/event-collection-queries";

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

/**
 * 서버로 나갈 좌표의 정밀도를 떨어뜨린다.
 *
 * 소수 둘째 자리는 위도로 약 1.1km 다. 반경 5km 조회의 기준점으로는 차이가 없고,
 * 집이나 지금 서 있는 자리를 특정하는 데는 쓸 수 없다. Near here 가 서버로 보내는
 * 값은 이 함수를 거친 것뿐이다 — 원본은 브라우저를 떠나지 않는다.
 *
 * 반올림을 부르는 쪽(handleLocateMe)에서 끝내 두는 것이 중요하다. 아래로 내려가는
 * 값이 처음부터 반올림된 것이라, 실수로 원본을 액션에 넘길 경로가 생기지 않는다.
 */
function roundForServer({ lat, lng }: { lat: number; lng: number }) {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

type DiscoverSuggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; placeName: string; placeId: string };

interface Props {
  allPlaces: (MapPlace & { isSaved?: boolean })[];
  savedPostIds: string[];
  savedEventIds?: string[];
  tagGroups: TagGroupWithTags[];
  topicTree: Level0TopicDeep[];
  isLoggedIn: boolean;
  /** 구독 토픽 — 검색바 아래 칩 줄. 비로그인·구독 없음이면 빈 배열이고 + 만 선다 */
  followedTopics?: TabTopic[];
  eventCollections?: ActiveEventCollection[];
  eventMapData?: Record<string, EventCollectionForMap | null>;
}

export function ExploreMapView({ allPlaces, savedPostIds, savedEventIds = [], tagGroups, topicTree, isLoggedIn, followedTopics = [], eventCollections = [], eventMapData = {} }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSavedView = searchParams.get("saved") === "1";
  const selectedPlaceId = searchParams.get("place");
  const collectionSlug = searchParams.get("collection");

  const [sheetState, setSheetState] = useState<PlaceListSheetState>(
    selectedPlaceId ? "hidden" : "half"
  );
  const [focusedPlaceIds, setFocusedPlaceIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  /**
   * Near here 줄의 기준점. **이미 반올림된 값이다** — 원본 GPS 좌표는 여기 들어오지 않는다.
   * 버튼을 누르기 전에는 null 이고, 그때 줄 자체가 없다.
   *
   * 좌표와 함께 "누를 당시의 조건"을 적어 둔다. 아래 nearHereCenter 가 지금 조건과
   * 대조해, 그 뒤에 지역을 바꾸거나 필터를 건 적이 있으면 줄을 내린다.
   */
  const [nearHere, setNearHere] = useState<{
    center: RoundedCenter;
    filterKey: string;
  } | null>(null);
  const { toast, showToast } = useToast();
  const mapRef = useRef<FocusCameraHandle>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const { recents, addRecent, removeRecent, clearRecents } = useRecentSearches();
  const { restored, save, clear } = useDiscoverViewState();

  const {
    isFilterOpen,
    stagedTopicIds,
    stagedTagIds,
    stagedTagGroupKeys,
    stagedRegion,
    stagedDistrict,
    appliedTopicIds,
    appliedTagIds,
    appliedTagGroupKeys,
    appliedPlaceCategory,
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
    toggleAppliedTopic,
    togglePlaceCategory,
    toggleTopic,
    toggleTopicGroup,
    toggleTag,
    toggleTagGroup,
    toggleRegion,
    toggleDistrict,
  } = useDiscoverFilters({
    topicTree,
    tagGroups,
    allPlaces,
    onExitQuery: () => setQuery(""),
    onFiltersApplied: () => setSheetState("half"),
    shouldKeepSelectedPlace,
  });

  useEffect(() => {
    if (!restored) return;
    setQuery(restored.query);
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

  // 컬렉션 진입/변경/종료 시 이벤트 검색·카테고리·북마크 초기화
  useEffect(() => {
    setEventQuery("");
    setSelectedCategory(null);
    setSavedOnly(false);
  }, [collectionSlug]);

  const handlePostNavigate = () => {
    save({ query, scrollTop: listScrollRef.current?.scrollTop ?? 0 });
  };

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
        // 원본 좌표. 지도(카메라 · 내 위치 점)에만 쓴다 — 서버로 보내지 않는다
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        mapRef.current?.focusCamera(coords);
        // 지도가 옮겨 간 중심을 소수 둘째 자리로 반올림한 값만 Near here 로 넘긴다.
        // focusCamera 가 방금 이 좌표로 옮겼으므로 "지도 중심" 이 곧 이 값이고,
        // 카메라를 되읽는 핸들을 새로 내지 않아도 같은 수가 나온다
        setNearHere({ center: roundForServer(coords), filterKey: filterKeyRef.current });
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

  /**
   * 장소가 하나라도 있는 카테고리. 고를 수 없는 칩(지금 dev 의 Bar)을 접는다.
   *
   * 기준은 allPlaces — 검색어·필터는 물론 저장 목록 보기(visiblePlaces)도 거치지 않은
   * 지도 전체다. 그래서 무엇을 걸든 칩 구성이 흔들리지 않는다. 저장 목록에서도 같은
   * 칩이 서고, 그 중 결과가 0인 칩은 "저장한 것 중엔 없다" 를 0 places 로 말한다.
   */
  const availablePlaceCategories = useMemo(() => {
    const set = new Set<PlaceCategoryChip>();
    for (const place of allPlaces)
      for (const category of placeCategories(place.placePlaceTypes))
        if ((PLACE_CATEGORY_CHIPS as readonly string[]).includes(category))
          set.add(category as PlaceCategoryChip);
    return set;
  }, [allPlaces]);

  // isResultMode보다 먼저 선언해야 참조 가능
  const activeEventData = useMemo(
    () =>
      collectionSlug !== null && eventMapData
        ? (eventMapData[collectionSlug] ?? null)
        : null,
    [collectionSlug, eventMapData]
  );
  const isEventMode = activeEventData !== null;

  const isResultMode = !isEventMode && (query.trim() !== "" || hasFilters);
  // 카메라용 결과 모드 — 지역을 뺀 나머지(검색어·토픽·태그)다.
  // 지역은 regionKey 가 따로 맡는다. boundsKey 에 두면 지역을 벗을 때도 키가 바뀌어
  // 전국으로 튀는데, 벗을 때는 보던 자리에 그대로 있어야 한다.
  const hasCameraFilters = !isEventMode && (query.trim() !== "" || hasPostLevelFilter);
  /**
   * 지금 걸린 조건을 한 줄로 적은 것. Near here 가 아직 유효한지를 이 값으로 가른다.
   *
   * 지역·토픽·태그·카테고리·검색어를 전부 담는다 — 셋 중 무엇이 바뀌어도 값이 달라진다.
   */
  const filterKey = [
    query.trim(),
    [...appliedTopicIds].sort().join(","),
    [...appliedTagIds].sort().join(","),
    [...appliedTagGroupKeys].sort().join(","),
    appliedPlaceCategory ?? "",
    appliedRegion ?? "",
    appliedDistrict ?? "",
  ].join("|");

  /**
   * 버튼을 누르는 순간의 filterKey 를 읽기 위한 통로.
   *
   * handleLocateMe 는 geolocation 콜백 안에서 값을 읽는데, 그 콜백은 버튼을 누른
   * 시점의 렌더에 묶여 있다. 좌표가 도착하는 사이에 조건이 바뀌었다면 **도착 시점의**
   * 조건을 적어야 맞다 — ref 가 그 값을 준다.
   */
  const filterKeyRef = useRef(filterKey);
  filterKeyRef.current = filterKey;

  /**
   * Near here 에 실제로 넘기는 기준점.
   *
   * **"마지막 동작이 내 위치 버튼일 때만" 이 규칙이고, 이 한 줄이 그 규칙이다.**
   * 버튼을 누른 뒤 지역을 바꾸거나 토픽·카테고리·검색을 걸면 filterKey 가 달라져
   * null 이 되고 줄이 사라진다. 버튼을 다시 누르면 지금 조건으로 다시 적히므로 다시 뜬다.
   *
   * 조건이 바뀔 때 상태를 지우는 effect 를 두지 않는다 — 지우는 자리를 필터 경로마다
   * 찾아 붙여야 하고(칩·시트·검색·지역 칩이 전부 다른 길이다) 하나라도 빠뜨리면
   * 그 경로에서만 줄이 남는다. 대조는 한 곳에서 끝난다.
   */
  const nearHereCenter = nearHere && nearHere.filterKey === filterKey ? nearHere.center : null;

  /**
   * 섹션을 그릴지. **판정은 이 한 곳뿐이다** — Near here · 여정 생성 CTA · 목록 분할 ·
   * DiscoverSections 가 전부 이 값을 본다.
   *
   * 토픽(칩·필터 시트) · 태그 · 카테고리 · 검색어 중 하나라도 걸리면 화면의 질문이
   * "어디로 갈까" 에서 "무엇을 찾는가" 로 바뀐다. 그때는 답이 목록 하나뿐이라
   * 그 위에 얹힌 줄들이 전부 방해다. 그래서 통째로 접고 목록만 남긴다.
   *
   * **지역(region·district)은 예외다.** 지역은 좁히는 조건이 아니라 섹션이 무엇을
   * 보여줄지 정하는 축이다 — 지역을 고르면 섹션이 사라지는 게 아니라 그 지역 것으로 바뀐다.
   *
   * 이벤트 모드는 컬렉션이 화면을 통째로 쓰고, 저장 목록 보기는 "내가 저장한 것"이라는
   * 약속이 있어 둘 다 접는다.
   */
  const showSections =
    !isEventMode &&
    !isSavedView &&
    query.trim() === "" &&
    appliedTopicIds.length === 0 &&
    appliedTagIds.length === 0 &&
    appliedTagGroupKeys.length === 0 &&
    appliedPlaceCategory === null;

  /**
   * Near here 축제 줄이 쓸 지역 (NearHereSection 의 NearHereRegion 참고).
   *
   * 지금 걸린 지역이 있으면 그 시도를, 없으면 지도 중심에서 가장 가까운 장소의 Area 로
   * 역산한 시도를 쓴다 (명세 4.7 의 (b) 안). 못 정하면 null 이고 축제 줄은 서지 않는다.
   *
   * **언제나 시도 단위다 (district 를 넘기지 않는다).** 거르는 기준이 반경 10km 인데
   * 시군구로 받으면 그 반경이 구 경계에서 잘린다 — 시청에서 10km 면 종로·중구·용산·마포가
   * 다 들어오는데 종로구 목록만 받으면 나머지가 통째로 빠진다.
   * 시도 하나짜리 캐시 항목은 구 단위보다 재사용도 잘 된다.
   */
  const nearHereRegion = useMemo(() => {
    if (appliedRegion) return { regionKey: appliedRegion, district: null };
    if (!nearHereCenter) return null;

    let best: { slug: string; d2: number } | null = null;
    for (const place of allPlaces) {
      const slug = getPlaceRegionSlug(place.area);
      if (!slug) continue;
      // 제곱거리로 비교한다 — 가장 가까운 하나만 고르므로 실제 거리가 필요 없다
      const dLat = place.latitude - nearHereCenter.lat;
      const dLng = place.longitude - nearHereCenter.lng;
      const d2 = dLat * dLat + dLng * dLng;
      if (!best || d2 < best.d2) best = { slug, d2 };
    }
    return best ? { regionKey: best.slug, district: null } : null;
  }, [appliedRegion, nearHereCenter, allPlaces]);

  // 검색바 아래 두 번째 줄이 있는지. 시트가 위로 올라갈 수 있는 한계를 이 값이 정한다.
  //
  // 이벤트 모드는 EventSearchBar(검색+칩)가 항상 떠 있다.
  // 비이벤트는 구독 토픽 칩 줄이 항상 뜬다 — 구독이 0개여도 + 하나가 서기 때문이다.
  // 그래서 지금은 어느 모드에서도 참이다. 둘 중 한쪽 줄이 접히게 되면 여기가 다시 갈린다.
  const needsTopReserve = true;

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

  /**
   * 필터를 next 로 바꾸면 지금 선택된 장소가 결과에 남는가 — commitFilters 가 이 답으로
   * ?place= 를 지울지 정한다. 판정은 filteredPlaces 와 같은 파이프라인이다:
   * searchedPlaces(검색어·saved 까지 적용된 집합)에서 찾고, 나머지는 placeMatchesFilters 에
   * next 를 넣어 본다. 새 판정 규칙을 만들지 않는다.
   *
   * 함수 선언이라 호이스팅된다 — useDiscoverFilters 호출부가 이 줄 위에 있어도 되고,
   * 실제 호출은 렌더가 끝난 뒤 이벤트 핸들러에서만 일어난다.
   */
  function shouldKeepSelectedPlace(next: FilterState): boolean {
    if (!selectedPlaceId) return true;
    // 이벤트 모드의 선택은 이 파이프라인 밖(컬렉션의 이벤트 장소)이라 건드리지 않는다
    if (isEventMode) return true;
    const place = searchedPlaces.find((p) => p.id === selectedPlaceId);
    if (!place) return false;
    const nextHasPostLevelFilter =
      next.topicIds.length > 0 || next.tagIds.length > 0 || next.tagGroupKeys.length > 0;
    const matchedPosts = new Map([
      [
        place.id,
        place.posts.filter((post) =>
          postMatchesFilters(post, next.topicIds, next.tagIds, next.tagGroupKeys)
        ),
      ],
    ]);
    return placeMatchesFilters(place, nextHasPostLevelFilter, matchedPosts, next.region, next.district, next.placeCategory);
  }

  // topic/tag/tagGroup 필터에 매칭되는 posts를 place당 한 번만 계산 — filteredPlaces 포함 판정과
  // filteredMarkerPlaces 색/카운트 계산이 이 결과를 공유해 동일 post 배열을 중복 스캔하지 않는다.
  const matchedPostsByPlaceId = useMemo(() => {
    const map = new Map<string, MapPost[]>();
    if (!hasPostLevelFilter) return map;
    for (const place of searchedPlaces) {
      map.set(
        place.id,
        place.posts.filter((post) => postMatchesFilters(post, appliedTopicIds, appliedTagIds, appliedTagGroupKeys))
      );
    }
    return map;
  }, [searchedPlaces, hasPostLevelFilter, appliedTopicIds, appliedTagIds, appliedTagGroupKeys]);

  const filteredPlaces = useMemo(() => {
    if (!hasFilters) return searchedPlaces;
    const matched = searchedPlaces.filter((p) =>
      placeMatchesFilters(p, hasPostLevelFilter, matchedPostsByPlaceId, appliedRegion, appliedDistrict, appliedPlaceCategory)
    );
    return [...matched].sort(
      (a, b) =>
        placeMatchScore(b, appliedTopicIds, appliedTagIds) -
        placeMatchScore(a, appliedTopicIds, appliedTagIds)
    );
  }, [searchedPlaces, hasFilters, hasPostLevelFilter, matchedPostsByPlaceId, appliedTopicIds, appliedTagIds, appliedRegion, appliedDistrict, appliedPlaceCategory]);

  // topicTree 전체를 한 번만 순회해 topicId → 색 맵을 만들어둔다 (place마다 트리 재순회 방지)
  const topicColorMap = useMemo(() => buildTopicColorMap(topicTree), [topicTree]);

  const filteredMarkerPlaces = useMemo(() => {
    // 색/카운트 재계산은 topic 또는 tag 필터가 있을 때만 의미가 있고, 이벤트 모드에서는
    // 이 결과 자체가 렌더에 쓰이지 않으므로(아래 places prop 참고) 재계산을 건너뛴다.
    // 지역(region) 전용 필터는 place만 걸러낼 뿐 posts 구성/색을 바꾸지 않으므로 마찬가지로 건너뛴다.
    if (isEventMode || !hasPostLevelFilter) return filteredPlaces;

    return filteredPlaces.map((place) => {
      const matchedPosts = matchedPostsByPlaceId.get(place.id) ?? [];

      // 적용된 topic 필터를 순서대로 보며 매칭되는 첫 토픽 노드 t를 찾는다.
      // 순회 순서: appliedTopicIds(외부) → matchedPosts → post.topics ("필터 id 우선, 그 안에서 post 등장 순서").
      // 그룹(L0/L1) 필터여도 t는 매칭된 실제 하위 토픽(L2/L3)이므로, 마커를 그룹 단색이 아닌 그 하위색으로 칠하게 된다.
      let matchedTopicNode: MapPost["topics"][number] | undefined;
      for (const id of appliedTopicIds) {
        for (const post of matchedPosts) {
          const t = post.topics.find((t) => topicMatchesFilter(t, id));
          if (t) { matchedTopicNode = t; break; }
        }
        if (matchedTopicNode) break;
      }
      // 조회 key만 교체: 필터 id가 아니라 매칭 노드 t.id로 topicColorMap 조회 (판정 기준은 buildTopicColorMap 그대로 유지)
      const filterGradient = matchedTopicNode ? topicColorMap.get(matchedTopicNode.id) : undefined;

      let markerColor: string | undefined;
      let markerGradient: ReturnType<typeof getTopicMarkerGradient>;

      if (filterGradient) {
        markerColor = filterGradient.colorHex;
        markerGradient = filterGradient;
      } else {
        // 필터 topic이 topicColorMap에 없거나(예: 토픽 비활성화) topic 필터가 없는 경우(tag-only 등)
        markerColor = getTopicMarkerColor(matchedPosts);
        markerGradient = getTopicMarkerGradient(matchedPosts);
      }

      // 필드만 override한 새 객체 반환 (원본 place 불변)
      return {
        ...place,
        markerColor,
        markerGradient,
        postCount: matchedPosts.length,
      };
    });
  }, [isEventMode, filteredPlaces, hasPostLevelFilter, matchedPostsByPlaceId, appliedTopicIds, topicColorMap]);

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

  /**
   * "Create a journey here" 의 기준점.
   *
   * 맵 카메라 중심이 아니라 목록 맨 위 장소를 쓴다 — 그 카드가 사용자가 지금 보고 있는
   * 것이고, InteractiveMap 에 getCenter 를 새로 뚫지 않아도 된다.
   * 목록이 비면 기준점이 없고 CTA 도 그릴 필요가 없다 (그 분기는 빈 상태가 따로 받는다).
   */
  /**
   * 섹션이 끼어드는 자리. 목록 앞 여섯 장 뒤다.
   *
   * 목록이 먼저 와야 "이 지역에 무엇이 있나" 라는 물음에 바로 답이 되고, 여섯 장이면
   * 훑고 나서 아래로 더 갈 이유가 생기는 길이다. 여섯 이하면 tail 이 비어 섹션이
   * 자연히 목록 뒤로 간다 — 따로 분기하지 않는다.
   */
  const SECTION_INSERT_AFTER = 6;
  const headPosts = showSections
    ? allVisiblePosts.slice(0, SECTION_INSERT_AFTER)
    : allVisiblePosts;
  const tailPosts = showSections ? allVisiblePosts.slice(SECTION_INSERT_AFTER) : [];

  const journeyAnchor = useMemo(() => {
    const place = allVisiblePosts[0]?.place;
    if (!place) return null;
    const params = new URLSearchParams({
      lat: String(place.latitude),
      lng: String(place.longitude),
      near: place.nameEn,
    });
    return { href: `/journeys/new?${params.toString()}`, label: place.nameEn };
  }, [allVisiblePosts]);

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

  const effectiveSheetState = selectedPlaceId
    ? "hidden"
    : sheetState === "hidden"
      ? "tab-only"
      : sheetState;

  // 이벤트 모드만 칩이 없다 — 헤더 자체가 EventSheetHeader 라 자리도 없고, 보는 집합이
  // 장소가 아니라 이벤트다. 저장 목록 보기에는 칩이 있다: 카테고리는 어차피 filteredPlaces
  // 에 걸리므로, 칩을 접으면 통제할 수 없는 필터가 숨은 채 걸린다.
  //
  // 설 칩이 하나도 없으면 줄 자체를 접는다. 조건은 헤더의 렌더 조건과 같은 식이어야
  // 아래 FAB 높이가 어긋나지 않는다 (URL 로 고른 칩은 0곳이어도 서기 때문).
  const showCategoryChips =
    !isEventMode && (availablePlaceCategories.size > 0 || appliedPlaceCategory !== null);

  // FAB bottom 계산용 — tabOnlyH는 측정값 근사(핸들+헤더 80, 칩 줄이 있으면 그만큼 더),
  // fullTop은 PlaceListSheet와 동일 공식
  const fabSheetH = getSheetHeight(
    effectiveSheetState,
    80 + (showCategoryChips ? CATEGORY_CHIP_ROW_HEIGHT : 0),
    needsTopReserve ? 96 : 64
  );

  return (
    // 지도는 100dvh 전체를 쓴다 — 탭바가 그 위에 떠야 반투명·blur 가 의미를 갖는다.
    // 안쪽의 시트·FAB·카드는 각자 var(--bottom-nav-space) 만큼 올라간다.
    <div className="relative h-[100dvh] overflow-hidden">
      <InteractiveMap
        ref={mapRef}
        places={isEventMode ? visibleEventMarkers : filteredMarkerPlaces}
        selectedPlaceId={selectedPlaceId}
        focusedPlaceIds={focusedPlaceIds}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        boundsKey={
          isEventMode
            ? `collection:${collectionSlug}`
            : hasCameraFilters
              ? `q:${query}|t:${[...appliedTopicIds].sort().join(",")}|tg:${[...appliedTagIds].sort().join(",")}|gk:${[...appliedTagGroupKeys].sort().join(",")}`
              : isSavedView ? "saved" : "all"
        }
        regionKey={
          !isEventMode && appliedRegion ? `${appliedRegion}/${appliedDistrict ?? ""}` : null
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

      {/* 구독 토픽 칩 — 검색바 바로 아래 한 줄 (명세 4.1). Hot 은 없다.
          이벤트 모드에서는 화면을 컬렉션이 통째로 쓰므로 접는다.

          facets 와 달리 시트가 full 이어도 남는다. 검색바가 full 에서도 남기 때문이다 —
          "검색바 아래 한 줄" 인데 검색바만 남고 칩이 사라지면 줄이 통째로 없어진 것처럼
          보인다. 시트 full 의 윗변(FULL_TOP_WITH_FACETS = 96)에 걸리지 않게
          칩 줄은 58 에서 시작해 96 에서 끝난다 (DiscoverTopicChips 참고).

          구독이 0개여도 그린다: + 하나가 남아 "구독할 수 있다"를 그 자리에서 말한다 */}
      {!isEventMode && (
        <DiscoverTopicChips
          topics={followedTopics}
          appliedTopicIds={appliedTopicIds}
          isLoggedIn={isLoggedIn}
          onToggleTopic={toggleAppliedTopic}
        />
      )}

      {!isEventMode && effectiveSheetState !== "full" && (
        <DiscoverActiveFacets
          /* 토픽 칩 줄이 58~96 을 쓰므로 그 아래에 앉는다 */
          topClass="top-[98px]"
          query={query}
          appliedTopicIds={appliedTopicIds}
          appliedTagIds={appliedTagIds}
          appliedTagGroupKeys={appliedTagGroupKeys}
          topicChipMap={topicChipMap}
          tagChipMap={tagChipMap}
          tagGroupChipMap={tagGroupChipMap}
          onClearQuery={handleClearQuery}
          onRemoveTopic={removeAppliedTopic}
          onRemoveTag={removeAppliedTag}
          onRemoveTagGroup={removeAppliedTagGroup}
          eventCollections={eventCollections}
          onEventCollectionClick={(slug) => setCollectionSlug(slug)}
          regions={availableCities}
          appliedRegion={appliedRegion}
          districts={appliedRegion ? (availableDistricts.get(appliedRegion) ?? []) : []}
          appliedDistrict={appliedDistrict}
          onRegionChange={(slug) => commitFilters({ topicIds: appliedTopicIds, tagIds: appliedTagIds, tagGroupKeys: appliedTagGroupKeys, placeCategory: appliedPlaceCategory, region: slug, district: null })}
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
              placeCount={filteredPlaces.length}
              isResultMode={isResultMode}
              isSavedView={isSavedView}
              query={query}
              onExitResultMode={exitResultMode}
              showCategoryChips={showCategoryChips}
              availablePlaceCategories={availablePlaceCategories}
              placeCategory={appliedPlaceCategory}
              onPlaceCategoryToggle={togglePlaceCategory}
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
        ) : (
          <>
          {/* ── Near here ────────────────────────────────────────────────────
              내 위치 버튼을 누르기 전에는 아무것도 없다. 기준점이 바뀌면 key 로 새로 만든다 */}
          {showSections && (
            <NearHereSection
              key={nearHereCenter ? `${nearHereCenter.lat},${nearHereCenter.lng}` : "none"}
              center={nearHereCenter}
              region={nearHereRegion}
            />
          )}

          {/* ── 여정 생성 CTA + 목록 앞 여섯 ─────────────────────────────────
              CTA 가 목록 첫 줄이라 목록 블록 안에 남는다. 섹션을 접을 때는 CTA 도 같이
              접는다 — 무엇을 찾는 중인 사람에게 "여기서 여정을 만들라"는 권유는 끼어드는 것이다 */}
          {allVisiblePosts.length > 0 && (
            <div className="px-4 pt-2 pb-2 space-y-2">
              {/* 코스 편집기 진입점. 지금 목록에 떠 있는 첫 장소를 기준점으로 넘긴다.
                  Course 에 지역 필드가 없어 "이 동네" 자체는 넘길 수 없다 —
                  넘길 수 있는 건 좌표뿐이고, 그건 Nearby Attractions 기준점으로만 쓰인다. */}
              {showSections && isLoggedIn && journeyAnchor && (
                <Link
                  href={journeyAnchor.href}
                  className="flex items-center gap-2.5 rounded-2xl bg-muted px-3.5 py-3 active:opacity-70 transition-opacity"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand">
                    <Route className="size-4 text-black" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      Create a journey here
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Start planning around {journeyAnchor.label}
                    </span>
                  </span>
                </Link>
              )}
              {headPosts.map(({ post, place }) => (
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
          )}

          {/* ── 섹션 ──────────────────────────────────────────────────────────
              목록 앞 여섯과 나머지 사이에 낀다. 목록이 여섯 이하면 tail 이 비어
              자연히 목록 뒤가 된다 */}
          {showSections && (
            <DiscoverSections
              /* 조건이 바뀌면 통째로 새로 만든다 — 섹션들이 이전 결과를 지우는 코드를
                 따로 갖지 않아도 옛 지역의 카드가 새 제목 아래 남지 않는다 */
              key={`${appliedRegion ?? ""}/${appliedDistrict ?? ""}/${[...appliedTopicIds].sort().join(",")}`}
              scope={{
                regionKey: appliedRegion,
                district: appliedDistrict,
                topicIds: appliedTopicIds,
              }}
              regionLabel={
                appliedRegion
                  ? (availableDistricts.get(appliedRegion) ?? []).find((d) => d.slug === appliedDistrict)?.label
                    ?? availableCities.find((c) => c.slug === appliedRegion)?.label
                    ?? null
                  : null
              }
              districts={appliedRegion ? (availableDistricts.get(appliedRegion) ?? []) : []}
              onSelectDistrict={(slug) =>
                commitFilters({
                  topicIds: appliedTopicIds,
                  tagIds: appliedTagIds,
                  tagGroupKeys: appliedTagGroupKeys,
                  placeCategory: appliedPlaceCategory,
                  region: appliedRegion,
                  district: slug,
                })
              }
            />
          )}

          {/* ── 장소 목록 나머지 ───────────────────────────────────────────── */}
          {allVisiblePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              {/* 저장 목록이 비는 이유는 둘이다 — 저장한 게 없거나, 걸러서 남은 게 없거나.
                  "아직 없다" 는 앞의 경우에만 참이다. 뒤의 경우는 벗을 필터가 있으니 그렇게 말한다 */}
              <p className="text-sm font-semibold text-foreground">
                {!isSavedView
                  ? "No places match your filters"
                  : isResultMode
                    ? "No saved places match your filters"
                    : "No saved places yet"}
              </p>
              {(!isSavedView || isResultMode) && (
                <p className="text-xs text-muted-foreground mt-1.5">Try removing a filter.</p>
              )}
            </div>
          ) : tailPosts.length > 0 ? (
            <div className="px-4 pt-2 pb-4 space-y-2">
              {tailPosts.map(({ post, place }) => (
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
          ) : (
            /* head 가 이미 전부를 그렸다 — 바닥 여백만 남긴다 */
            <div className="pb-4" />
          )}
          </>
        )}

        {/* 지역 관광 데이터(Attractions · Festivals)는 여기 있었다. 시트가 재편되면서
            DiscoverSections 안으로 옮겨 갔다 — Festivals 는 Journeys 위, Attractions 는
            목록 나머지 바로 위다. 여기 두면 같은 두 줄이 한 화면에 두 번 그려진다 */}
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
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}

      {/* 필터 시트 — z-[65] */}
      <DiscoverFilterSheet
        isOpen={isFilterOpen}
        onClose={closeFilter}
        topicTree={topicTree}
        tagGroups={tagGroups}
        topicChipMap={topicChipMap}
        tagChipMap={tagChipMap}
        tagGroupChipMap={tagGroupChipMap}
        stagedTopicIds={stagedTopicIds}
        stagedTagIds={stagedTagIds}
        stagedTagGroupKeys={stagedTagGroupKeys}
        onToggleTopic={toggleTopic}
        onToggleTopicGroup={toggleTopicGroup}
        onToggleTag={toggleTag}
        onToggleTagGroup={toggleTagGroup}
        onReset={resetStaged}
        onApply={applyFilters}
        regions={availableCities}
        stagedRegion={stagedRegion}
        onToggleRegion={toggleRegion}
        districts={stagedRegion ? (availableDistricts.get(stagedRegion) ?? []) : []}
        stagedDistrict={stagedDistrict}
        onToggleDistrict={toggleDistrict}
      />
    </div>
  );
}
