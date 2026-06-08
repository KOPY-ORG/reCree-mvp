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

export type EventCollectionMapMarker = {
  eventPlaceId: string; // EventPlace 행 id (마커 React key 용, 고유)
  eventId: string;
  eventSlug: string;
  nameEn: string; // 이벤트명
  category: EventCategory;
  startDate: Date;
  endDate: Date;
  openTime: string | null;
  closeTime: string | null;
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
  markers: EventCollectionMapMarker[];
};

function pickTranslation<T extends { locale: string }>(
  items: T[],
  locale = "en",
  fallback = "en",
): T | undefined {
  return (
    items.find((t) => t.locale === locale) ??
    items.find((t) => t.locale === fallback) ??
    items[0]
  );
}

/**
 * 컬렉션 slug를 받아 PUBLISHED 이벤트의 장소 마커 목록을 반환.
 * 이벤트당 장소 N개 → 마커 N개로 flatten. 좌표 없는 장소는 제외.
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
        orderBy: { startDate: "asc" },
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
            select: { locale: true, name: true },
          },
          places: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
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
      },
    },
  });

  if (!collection) return null;

  const collectionT = pickTranslation(collection.translations, "en");

  const markers: EventCollectionMapMarker[] = collection.events.flatMap((e) => {
    const t = pickTranslation(e.translations, "en");
    const eventName = t?.name ?? e.slug;

    return e.places
      .filter((ep) => ep.place.latitude !== null && ep.place.longitude !== null)
      .map((ep) => ({
        eventPlaceId: ep.id,
        eventId: e.id,
        eventSlug: e.slug,
        nameEn: eventName,
        category: e.category,
        startDate: e.startDate,
        endDate: e.endDate,
        openTime: e.openTime,
        closeTime: e.closeTime,
        entryType: e.entryType,
        bannerImageUrl: e.bannerImageUrl,
        place: {
          id: ep.place.id,
          latitude: ep.place.latitude!,
          longitude: ep.place.longitude!,
          nameEn: ep.place.nameEn ?? ep.place.nameKo ?? "",
          addressEn: ep.place.addressEn ?? ep.place.addressKo ?? null,
        },
      }));
  });

  return {
    collection: {
      id: collection.id,
      slug: collection.slug,
      nameEn: collectionT?.name ?? collection.slug,
    },
    markers,
  };
}
