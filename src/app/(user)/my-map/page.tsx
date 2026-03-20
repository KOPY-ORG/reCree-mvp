import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllMapPlaces, getSavedMapPlaces } from "@/lib/map-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { getSavedPostIds } from "@/lib/post-queries";
import { searchMapPlaces } from "./_actions/search-places";
import { MapPageClient } from "./_components/MapPageClient";

export default async function MyTripPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q, tab } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const initialTab = tab === "my-maps" ? "my-maps" : "places";

  const currentUser = await getCurrentUser();

  const [allPlaces, savedPlaces, savedPostIds, topics, tagGroups, tagGroupConfigs, searchedPlaces, btsTopic] =
    await Promise.all([
      getAllMapPlaces(),
      currentUser ? getSavedMapPlaces(currentUser.id) : Promise.resolve([]),
      getSavedPostIds(currentUser?.id ?? null),
      getLevel0TopicsDeep(),
      getTagGroupsWithTags(),
      prisma.tagGroupConfig.findMany({
        select: {
          group: true,
          nameEn: true,
          colorHex: true,
          colorHex2: true,
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
        },
      }),
      query ? searchMapPlaces(query) : Promise.resolve(null),
      prisma.topic.findFirst({
        where: { nameEn: "BTS" },
        select: {
          id: true,
          colorHex: true,
          parent: {
            select: {
              colorHex: true,
              parent: {
                select: {
                  colorHex: true,
                  parent: { select: { colorHex: true } },
                },
              },
            },
          },
        },
      }),
    ]);

  const btsTopicId = btsTopic?.id ?? null;
  const btsTopicColor =
    btsTopic?.colorHex ??
    btsTopic?.parent?.colorHex ??
    btsTopic?.parent?.parent?.colorHex ??
    btsTopic?.parent?.parent?.parent?.colorHex ??
    null;

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
        searchQuery={query}
        searchedPlaces={searchedPlaces}
        initialTab={initialTab}
        btsTopicId={btsTopicId}
        btsTopicColor={btsTopicColor}
      />
    </Suspense>
  );
}
