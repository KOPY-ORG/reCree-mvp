"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import { PlaceBottomSheet } from "@/components/maps/PlaceBottomSheet";
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
  allPlaces: MapPlace[];
  savedPostIds: string[];
  tagGroupConfigs: TagGroupConfig[];
}

export function ExploreMapView({ allPlaces, savedPostIds, tagGroupConfigs }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedPlaceId = searchParams.get("place");

  function setSelectedPlaceId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("place", id);
    } else {
      params.delete("place");
    }
    router.replace(`?${params.toString()}`);
  }

  const handleMarkerClick = (placeId: string) => setSelectedPlaceId(placeId);
  const handlePlaceClose = () => setSelectedPlaceId(null);

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

  return (
    // header(h-12=48px) + bottomnav(h-16=64px) = 112px
    <div className="relative h-[calc(100dvh-112px)] overflow-hidden">
      <InteractiveMap
        places={markerPlaces}
        selectedPlaceId={selectedPlaceId}
        onMarkerClick={handleMarkerClick}
        className="absolute inset-0"
      />
      <PlaceBottomSheet
        place={selectedPlace}
        savedPostIds={savedPostIdsSet}
        tagGroupMap={tagGroupMap}
        onClose={handlePlaceClose}
      />
    </div>
  );
}
