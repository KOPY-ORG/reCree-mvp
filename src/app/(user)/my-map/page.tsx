import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllMapPlaces, getSavedMapPlaces } from "@/lib/map-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { getSavedPostIds } from "@/lib/post-queries";
import { MapPageClient } from "./_components/MapPageClient";

export default async function MyTripPage() {
  const currentUser = await getCurrentUser();

  const [allPlaces, savedPlaces, savedPostIds, topics, tagGroups, tagGroupConfigs] =
    await Promise.all([
      getAllMapPlaces(),
      currentUser ? getSavedMapPlaces(currentUser.id) : Promise.resolve([]),
      getSavedPostIds(currentUser?.id ?? null),
      getLevel0TopicsDeep(),
      getTagGroupsWithTags(),
      prisma.tagGroupConfig.findMany({
        select: {
          group: true,
          colorHex: true,
          colorHex2: true,
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
        },
      }),
    ]);

  return (
    <Suspense>
      <MapPageClient
        allPlaces={allPlaces}
        savedPlaces={savedPlaces}
        savedPostIds={Array.from(savedPostIds)}
        topics={topics}
        tagGroups={tagGroups}
        tagGroupConfigs={tagGroupConfigs}
        isLoggedIn={!!currentUser}
        userInitial={currentUser?.email?.[0]?.toUpperCase() ?? null}
      />
    </Suspense>
  );
}
