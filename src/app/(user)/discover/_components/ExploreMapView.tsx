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
import type { MapPlace } from "@/lib/map-queries";
import { getTopicMarkerColor } from "@/lib/map-utils";

type TagGroupConfig = {
  group: string;
  displayLabel: string | null;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

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
    () => allPlaces.map((p) => ({ ...p, markerColor: getTopicMarkerColor(p.posts) })),
    [allPlaces]
  );

  const visiblePlaces = useMemo(
    () => (isSavedView ? markerPlaces.filter((p) => p.isSaved) : markerPlaces),
    [isSavedView, markerPlaces]
  );

  const allVisiblePosts = useMemo(
    () => visiblePlaces.flatMap((place) => place.posts.map((post) => ({ post, place }))),
    [visiblePlaces]
  );

  const effectiveSheetState = !selectedPlaceId && sheetState === "hidden" ? "tab-only" : sheetState;

  return (
    // bottomnav(h-16=64px) — ExploreHeader 제거됨
    <div className="relative h-[calc(100dvh-64px)] overflow-hidden">
      <InteractiveMap
        places={visiblePlaces}
        selectedPlaceId={selectedPlaceId}
        onMarkerClick={handleMarkerClick}
        boundsKey={isSavedView ? "saved" : undefined}
        className="absolute inset-0"
      />
      <DiscoverSearchBar isLoggedIn={isLoggedIn} />

      {/* 기본 리스트 시트 — z-40 */}
      <PlaceListSheet
        state={effectiveSheetState}
        onStateChange={setSheetState}
        topOffset={64}
        header={
          <DiscoverSheetHeader
            contentTab={contentTab}
            onContentTabChange={setContentTab}
            placeCount={visiblePlaces.length}
          />
        }
      >
        {contentTab === "list" ? (
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
