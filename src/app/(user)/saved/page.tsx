import Link from "next/link";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels } from "@/lib/post-queries";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";
import { SavedClient } from "./_components/SavedClient";

export default async function SavedPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <LogIn className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Sign in to view saved places</p>
          <p className="text-sm text-muted-foreground">
            Save your favorite posts and access them anytime.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const [savedPostIds, savedReCreeshotIds, savedEventIds, tagGroupConfigs] = await Promise.all([
    prisma.save
      .findMany({
        where: { userId: currentUser.id, targetType: "POST" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map((r) => r.targetId)),
    prisma.save
      .findMany({
        where: { userId: currentUser.id, targetType: "RECREESHOT" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map((r) => r.targetId)),
    prisma.save
      .findMany({
        where: { userId: currentUser.id, targetType: "EVENT" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map((r) => r.targetId)),
    prisma.tagGroupConfig.findMany({
      select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  const recreeshots =
    savedReCreeshotIds.length > 0
      ? await prisma.reCreeshot.findMany({
          where: { id: { in: savedReCreeshotIds }, status: { not: "DELETED" } },
          select: { id: true, imageUrl: true, referencePhotoUrl: true, status: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const posts =
    savedPostIds.length > 0
      ? await getPostsWithLabels(
          { id: { in: savedPostIds }, status: "PUBLISHED", isShop: false },
          { take: savedPostIds.length }
        )
      : [];

  const shopPosts =
    savedPostIds.length > 0
      ? await getPostsWithLabels(
          { id: { in: savedPostIds }, status: "PUBLISHED", isShop: true },
          { take: savedPostIds.length }
        )
      : [];

  const savedEventsRaw =
    savedEventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: savedEventIds }, status: "PUBLISHED" },
          select: {
            id: true,
            slug: true,
            category: true,
            startDate: true,
            endDate: true,
            openTime: true,
            closeTime: true,
            entryType: true,
            bannerImageUrl: true,
            collection: {
              select: {
                slug: true,
                translations: {
                  where: { locale: { in: ["en", "ko"] } },
                  select: { locale: true, name: true },
                },
              },
            },
            translations: {
              where: { locale: { in: ["en", "ko"] } },
              select: { locale: true, name: true },
            },
            places: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                place: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameKo: true,
                    latitude: true,
                    longitude: true,
                    addressEn: true,
                    addressKo: true,
                  },
                },
              },
            },
          },
        })
      : [];

  const savedEventsMap = new Map(savedEventsRaw.map((e) => [e.id, e]));
  const savedEvents: {
    marker: EventCollectionMapMarker;
    collectionName: string;
    collectionSlug: string;
    placeCount: number;
  }[] = savedEventIds
    .filter((id) => savedEventsMap.has(id))
    .map((id) => {
      const e = savedEventsMap.get(id)!;
      const pickName = (ts: { locale: string; name: string }[]) =>
        ts.find((t) => t.locale === "en")?.name ?? ts.find((t) => t.locale === "ko")?.name;
      const firstPlace = e.places[0];
      return {
        marker: {
          eventPlaceId: firstPlace?.id ?? e.id,
          eventId: e.id,
          eventSlug: e.slug,
          nameEn: pickName(e.translations) ?? e.slug,
          category: e.category,
          startDate: e.startDate,
          endDate: e.endDate,
          openTime: e.openTime,
          closeTime: e.closeTime,
          entryType: e.entryType,
          bannerImageUrl: e.bannerImageUrl,
          place: {
            id: firstPlace?.place.id ?? e.id,
            latitude: firstPlace?.place.latitude ?? 0,
            longitude: firstPlace?.place.longitude ?? 0,
            nameEn: firstPlace?.place.nameEn ?? firstPlace?.place.nameKo ?? "",
            addressEn: firstPlace?.place.addressEn ?? firstPlace?.place.addressKo ?? null,
          },
        },
        collectionName: pickName(e.collection.translations) ?? e.collection.slug,
        collectionSlug: e.collection.slug,
        placeCount: e.places.length,
      };
    });

  return (
    <SavedClient
      posts={posts}
      shopPosts={shopPosts}
      recreeshots={recreeshots}
      tagGroupConfigs={tagGroupConfigs}
      savedEvents={savedEvents}
    />
  );
}
