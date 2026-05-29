import { prisma } from "@/lib/prisma";
import { getSavedPostIds } from "@/lib/post-queries";
import { getAllMapPlaces } from "@/lib/map-queries";
import { getCurrentUser } from "@/lib/auth";
import { ExploreMapView } from "./_components/ExploreMapView";

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();

  const [tagGroupConfigs, savedPostIds, allPlaces] = await Promise.all([
    prisma.tagGroupConfig.findMany({
      select: {
        group: true,
        displayLabel: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
      },
    }),
    getSavedPostIds(currentUser?.id ?? null),
    getAllMapPlaces(),
  ]);

  const placesWithSaved = allPlaces.map((place) => ({
    ...place,
    isSaved: place.posts.some((p) => savedPostIds.has(p.id)),
  }));

  return (
    <ExploreMapView
      allPlaces={placesWithSaved}
      savedPostIds={[...savedPostIds]}
      tagGroupConfigs={tagGroupConfigs}
      isLoggedIn={!!currentUser}
    />
  );
}
