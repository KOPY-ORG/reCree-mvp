import { getSavedPostIds, getSavedEventIds } from "@/lib/post-queries";
import { getAllMapPlaces } from "@/lib/map-queries";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import {
  getActiveEventCollections,
  getEventCollectionForMap,
} from "@/lib/event-collection-queries";
import type { EventCollectionForMap } from "@/lib/event-collection-queries";
import { ExploreMapView } from "./_components/ExploreMapView";

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();

  // 칩용 컬렉션 목록을 먼저 받아야 맵데이터 병렬 preload 가능
  const eventCollections = await getActiveEventCollections();

  const [tagGroups, savedPostIds, savedEventIds, allPlaces, topicTree, eventMapDataEntries] =
    await Promise.all([
      getTagGroupsWithTags(),
      getSavedPostIds(currentUser?.id ?? null),
      getSavedEventIds(currentUser?.id ?? null),
      getAllMapPlaces(),
      getLevel0TopicsDeep(),
      Promise.all(
        eventCollections.map(
          async (c) =>
            [c.slug, await getEventCollectionForMap(c.slug)] as const
        )
      ),
    ]);

  const eventMapData: Record<string, EventCollectionForMap | null> =
    Object.fromEntries(eventMapDataEntries);

  const placesWithSaved = allPlaces.map((place) => ({
    ...place,
    isSaved: place.posts.some((p) => savedPostIds.has(p.id)),
  }));

  return (
    <ExploreMapView
      allPlaces={placesWithSaved}
      savedPostIds={[...savedPostIds]}
      savedEventIds={[...savedEventIds]}
      tagGroups={tagGroups}
      topicTree={topicTree}
      isLoggedIn={!!currentUser}
      eventCollections={eventCollections}
      eventMapData={eventMapData}
    />
  );
}
