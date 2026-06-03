import { getSavedPostIds } from "@/lib/post-queries";
import { getAllMapPlaces } from "@/lib/map-queries";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { getActiveEventCollections } from "@/lib/event-collection-queries";
import { ExploreMapView } from "./_components/ExploreMapView";

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();

  const [tagGroups, savedPostIds, allPlaces, topicTree, eventCollections] =
    await Promise.all([
      getTagGroupsWithTags(),
      getSavedPostIds(currentUser?.id ?? null),
      getAllMapPlaces(),
      getLevel0TopicsDeep(),
      getActiveEventCollections(),
    ]);

  const placesWithSaved = allPlaces.map((place) => ({
    ...place,
    isSaved: place.posts.some((p) => savedPostIds.has(p.id)),
  }));

  return (
    <ExploreMapView
      allPlaces={placesWithSaved}
      savedPostIds={[...savedPostIds]}
      tagGroups={tagGroups}
      topicTree={topicTree}
      isLoggedIn={!!currentUser}
      eventCollections={eventCollections}
    />
  );
}
