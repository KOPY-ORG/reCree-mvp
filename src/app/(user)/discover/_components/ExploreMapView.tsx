"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import { PlaceBottomSheet } from "@/components/maps/PlaceBottomSheet";
import { PlaceListSheet, type PlaceListSheetState } from "@/components/maps/PlaceListSheet";
import { PlaceListSheetCard } from "@/components/maps/PlaceListSheetCard";
import { DiscoverSearchBar } from "./DiscoverSearchBar";
import { DiscoverSheetHeader } from "./DiscoverSheetHeader";
import { HotTabStub } from "./HotTabStub";
import { useRecentSearches } from "../_hooks/useRecentSearches";
import type { MapPlace } from "@/lib/map-queries";
import { getTopicMarkerColor, getTopicMarkerGradient } from "@/lib/map-utils";

type TagGroupConfig = {
  group: string;
  displayLabel: string | null;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

type DiscoverSuggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; placeName: string; placeId: string };

interface Props {
  allPlaces: (MapPlace & { isSaved?: boolean })[];
  savedPostIds: string[];
  tagGroupConfigs: TagGroupConfig[];
  isLoggedIn: boolean;
}

export function ExploreMapView({ allPlaces, savedPostIds, tagGroupConfigs, isLoggedIn }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSavedView = searchParams.get("saved") === "1";
  const selectedPlaceId = searchParams.get("place");

  const [sheetState, setSheetState] = useState<PlaceListSheetState>(
    selectedPlaceId ? "hidden" : "half"
  );
  const [contentTab, setContentTab] = useState<"hot" | "list">("list");
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { recents, addRecent, removeRecent, clearRecents } = useRecentSearches();

  function setSelectedPlaceId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("place", id);
    } else {
      params.delete("place");
    }
    router.replace(`?${params.toString()}`);
  }

  const handleMarkerClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setSheetState("hidden");
  };

  const handlePlaceClose = () => {
    setSelectedPlaceId(null);
    setSheetState("tab-only");
  };

  const selectedPlace = allPlaces.find((p) => p.id === selectedPlaceId) ?? null;

  const savedPostIdsSet = useMemo(() => new Set(savedPostIds), [savedPostIds]);
  const tagGroupMap = useMemo(
    () => new Map(tagGroupConfigs.map((c) => [c.group, c])),
    [tagGroupConfigs]
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

  const isResultMode = query.trim() !== "";

  const searchedPlaces = useMemo(() => {
    if (!isResultMode) return visiblePlaces;
    const q = query.trim().toLowerCase();
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
  }, [isResultMode, query, visiblePlaces]);

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

  const allVisiblePosts = useMemo(
    () => searchedPlaces.flatMap((place) => place.posts.map((post) => ({ post, place }))),
    [searchedPlaces]
  );

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

  const effectiveSheetState = !selectedPlaceId && sheetState === "hidden" ? "tab-only" : sheetState;

  return (
    // bottomnav(h-16=64px) — ExploreHeader 제거됨
    <div className="relative h-[calc(100dvh-64px)] overflow-hidden">
      <InteractiveMap
        places={searchedPlaces}
        selectedPlaceId={selectedPlaceId}
        onMarkerClick={handleMarkerClick}
        boundsKey={isResultMode ? `q:${query}` : "all"}
        highlightedIds={isResultMode ? new Set(searchedPlaces.map((p) => p.id)) : undefined}
        className="absolute inset-0"
      />
      <DiscoverSearchBar
        isLoggedIn={isLoggedIn}
        query={query}
        isOpen={isSearchOpen}
        onOpen={handleSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onQueryChange={setQuery}
        onClearQuery={handleClearQuery}
        suggestions={suggestions}
        recents={recents}
        onSelectTerm={handleSelectTerm}
        onSelectPlace={handleSelectPlace}
        onRemoveRecent={removeRecent}
        onClearRecents={clearRecents}
      />

      {/* 기본 리스트 시트 — z-40 */}
      <PlaceListSheet
        state={effectiveSheetState}
        onStateChange={setSheetState}
        topOffset={64}
        header={
          <DiscoverSheetHeader
            contentTab={contentTab}
            onContentTabChange={setContentTab}
            placeCount={searchedPlaces.length}
            isResultMode={isResultMode}
            query={query}
            onClearQuery={handleClearQuery}
          />
        }
      >
        {(contentTab === "list" || isResultMode) ? (
          <div className="px-4 pb-4 space-y-2">
            {allVisiblePosts.map(({ post }) => (
              <PlaceListSheetCard
                key={post.id}
                post={post}
                isSaved={savedPostIdsSet.has(post.id)}
                tagGroupMap={tagGroupMap}
              />
            ))}
          </div>
        ) : (
          <HotTabStub />
        )}
      </PlaceListSheet>

      {/* 장소 상세 floating 카드 — z-50 */}
      <PlaceBottomSheet
        place={selectedPlace}
        savedPostIds={savedPostIdsSet}
        tagGroupMap={tagGroupMap}
        onClose={handlePlaceClose}
      />
    </div>
  );
}
