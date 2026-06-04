import { prisma } from "@/lib/prisma";
import type { EventCategory, EventEntryType } from "@prisma/client";

export type ActiveEventCollection = {
  id: string;
  slug: string;
  translations: { locale: string; name: string }[];
};

export async function getActiveEventCollections(): Promise<ActiveEventCollection[]> {
  return await prisma.eventCollection.findMany({
    where: {
      status: "PUBLISHED",
      events: {
        some: { status: "PUBLISHED" },
      },
    },
    select: {
      id: true,
      slug: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

// ── 이벤트 모드 지도용 타입 ───────────────────────────────────────────────────

export type EventCollectionMapEvent = {
  id: string;
  slug: string;
  nameEn: string;
  descriptionEn: string | null;
  startDate: Date;
  endDate: Date;
  openTime: string | null;
  closeTime: string | null;
  category: EventCategory;
  entryType: EventEntryType;
  bannerImageUrl: string | null;
  place: {
    id: string;
    latitude: number;
    longitude: number;
    nameEn: string;
    addressEn: string | null;
  };
};

export type EventCollectionForMap = {
  collection: { id: string; slug: string; nameEn: string };
  events: EventCollectionMapEvent[];
};

function pickTranslation<T extends { locale: string }>(
  items: T[],
  locale = "en",
  fallback = "ko",
): T | undefined {
  return (
    items.find((t) => t.locale === locale) ??
    items.find((t) => t.locale === fallback) ??
    items[0]
  );
}

/**
 * 컬렉션 slug를 받아 PUBLISHED 이벤트 목록을 마커+카드용으로 반환.
 * place 좌표(latitude/longitude)가 없는 이벤트는 제외.
 */
export async function getEventCollectionForMap(
  collectionSlug: string,
): Promise<EventCollectionForMap | null> {
  const collection = await prisma.eventCollection.findFirst({
    where: { slug: collectionSlug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      translations: { select: { locale: true, name: true } },
      events: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
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
          translations: {
            select: { locale: true, name: true, description: true },
          },
          place: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
              nameEn: true,
              nameKo: true,
              addressEn: true,
              addressKo: true,
            },
          },
        },
      },
    },
  });

  if (!collection) return null;

  const collectionT = pickTranslation(collection.translations, "en", "ko");

  const events: EventCollectionMapEvent[] = collection.events
    .filter((e) => e.place.latitude !== null && e.place.longitude !== null)
    .map((e) => {
      const t = pickTranslation(e.translations, "en", "ko");
      return {
        id: e.id,
        slug: e.slug,
        nameEn: t?.name ?? e.slug,
        descriptionEn: t?.description ?? null,
        startDate: e.startDate,
        endDate: e.endDate,
        openTime: e.openTime,
        closeTime: e.closeTime,
        category: e.category,
        entryType: e.entryType,
        bannerImageUrl: e.bannerImageUrl,
        place: {
          id: e.place.id,
          latitude: e.place.latitude!,
          longitude: e.place.longitude!,
          nameEn: e.place.nameEn ?? e.place.nameKo ?? "",
          addressEn: e.place.addressEn ?? e.place.addressKo ?? null,
        },
      };
    });

  return {
    collection: {
      id: collection.id,
      slug: collection.slug,
      nameEn: collectionT?.name ?? collection.slug,
    },
    events,
  };
}
