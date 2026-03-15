// 지도 페이지용 장소 + 포스트 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";

type TopicColorFields = {
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
};

export type MapPostTopic = TopicColorFields & {
  id: string;
  nameEn: string;
  level: number;
  parent?: (TopicColorFields & {
    id: string;
    level: number;
    parent?: (TopicColorFields & {
      id: string;
      level: number;
      parent?: (TopicColorFields & { id: string; level: number }) | null;
    }) | null;
  }) | null;
};

export type MapPost = {
  id: string;
  slug: string;
  titleEn: string;
  imageUrl: string | null;
  images: string[];
  topics: MapPostTopic[];
  tags: {
    id: string;
    group: string;
    name: string;
    colorHex: string | null;
    colorHex2: string | null;
    textColorHex: string | null;
  }[];
};

export type MapPlace = {
  id: string;
  nameEn: string;
  nameKo: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  addressKo: string | null;
  addressEn: string | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  imageUrl: string | null;
  phone: string | null;
  operatingHours: string[] | null;
  area: { id: string; nameKo: string; nameEn: string | null; level: number; parent: { nameKo: string; nameEn: string | null } | null } | null;
  placeImages: { url: string; isThumbnail: boolean; sortOrder: number }[];
  posts: MapPost[];
};

type RawPostPlaceRow = Awaited<ReturnType<typeof fetchPostPlaceRows>>[number];

async function fetchPostPlaceRows(where: object) {
  return prisma.postPlace.findMany({
    where,
    select: {
      place: {
        select: {
          id: true,
          nameEn: true,
          nameKo: true,
          latitude: true,
          longitude: true,
          rating: true,
          addressKo: true,
          addressEn: true,
          googleMapsUrl: true,
          naverMapsUrl: true,
          imageUrl: true,
          phone: true,
          operatingHours: true,
          area: {
            select: {
              id: true,
              nameKo: true,
              nameEn: true,
              level: true,
              parent: { select: { nameKo: true, nameEn: true } },
            },
          },
          placeImages: {
            orderBy: { sortOrder: "asc" },
            select: { url: true, isThumbnail: true, sortOrder: true },
          },
        },
      },
      post: {
        select: {
          id: true,
          slug: true,
          titleEn: true,
          postImages: {
            where: { slotIndex: null },
            orderBy: { sortOrder: "asc" },
            select: { url: true, isThumbnail: true },
          },
          postTopics: {
            where: { isVisible: true },
            orderBy: { displayOrder: "asc" },
            select: {
              topic: {
                select: {
                  id: true,
                  nameEn: true,
                  level: true,
                  colorHex: true,
                  colorHex2: true,
                  gradientDir: true,
                  gradientStop: true,
                  textColorHex: true,
                  parent: {
                    select: {
                      id: true,
                      level: true,
                      colorHex: true,
                      colorHex2: true,
                      gradientDir: true,
                      gradientStop: true,
                      textColorHex: true,
                      parent: {
                        select: {
                          id: true,
                          level: true,
                          colorHex: true,
                          colorHex2: true,
                          gradientDir: true,
                          gradientStop: true,
                          textColorHex: true,
                          parent: {
                            select: {
                              id: true,
                              level: true,
                              colorHex: true,
                              colorHex2: true,
                              gradientDir: true,
                              gradientStop: true,
                              textColorHex: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          postTags: {
            where: { isVisible: true },
            orderBy: { displayOrder: "asc" },
            select: {
              tag: {
                select: {
                  id: true,
                  group: true,
                  name: true,
                  colorHex: true,
                  colorHex2: true,
                  textColorHex: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

function groupByPlace(rows: RawPostPlaceRow[]): MapPlace[] {
  const map = new Map<string, MapPlace>();
  for (const { place, post } of rows) {
    if (place.latitude === null || place.longitude === null) continue;

    const thumbnailImg = post.postImages.find((img) => img.isThumbnail);
    const mapPost: MapPost = {
      id: post.id,
      slug: post.slug,
      titleEn: post.titleEn,
      imageUrl: thumbnailImg?.url ?? post.postImages[0]?.url ?? null,
      images: post.postImages.filter((img) => !img.isThumbnail).map((img) => img.url),
      topics: post.postTopics.map((pt) => pt.topic),
      tags: post.postTags.map((pt) => pt.tag),
    };

    const existing = map.get(place.id);
    if (existing) {
      if (!existing.posts.some((p) => p.id === post.id)) {
        existing.posts.push(mapPost);
      }
    } else {
      map.set(place.id, {
        id: place.id,
        nameEn: place.nameEn ?? place.nameKo,
        nameKo: place.nameKo,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        addressKo: place.addressKo,
        addressEn: place.addressEn,
        googleMapsUrl: place.googleMapsUrl,
        naverMapsUrl: place.naverMapsUrl,
        imageUrl: place.imageUrl,
        phone: place.phone,
        operatingHours: place.operatingHours as string[] | null,
        area: place.area ?? null,
        placeImages: place.placeImages,
        posts: [mapPost],
      });
    }
  }
  return Array.from(map.values());
}

/** ID 목록으로 장소 데이터 조회 (검색 결과용) */
export async function getMapPlacesByIds(ids: string[]): Promise<MapPlace[]> {
  if (ids.length === 0) return [];
  const rows = await fetchPostPlaceRows({
    placeId: { in: ids },
    post: { status: "PUBLISHED" },
  });
  return groupByPlace(rows);
}

/** 포스트 없는 장소도 포함하는 검색용 조회 */
export async function getMapPlacesByIdsWithFallback(ids: string[]): Promise<MapPlace[]> {
  if (ids.length === 0) return [];

  // 1. 포스트 연결된 장소 (기존 방식)
  const rows = await fetchPostPlaceRows({
    placeId: { in: ids },
    post: { status: "PUBLISHED" },
  });
  const placesWithPosts = groupByPlace(rows);
  const coveredIds = new Set(placesWithPosts.map((p) => p.id));

  // 2. 포스트 없는 장소 직접 조회
  const missingIds = ids.filter((id) => !coveredIds.has(id));
  if (missingIds.length === 0) return placesWithPosts;

  const rawPlaces = await prisma.place.findMany({
    where: { id: { in: missingIds } },
    select: {
      id: true,
      nameEn: true,
      nameKo: true,
      latitude: true,
      longitude: true,
      rating: true,
      addressKo: true,
      addressEn: true,
      googleMapsUrl: true,
      naverMapsUrl: true,
      imageUrl: true,
      phone: true,
      operatingHours: true,
      area: {
        select: {
          id: true,
          nameKo: true,
          nameEn: true,
          level: true,
          parent: { select: { nameKo: true, nameEn: true } },
        },
      },
      placeImages: {
        orderBy: { sortOrder: "asc" },
        select: { url: true, isThumbnail: true, sortOrder: true },
      },
    },
  });

  const placesWithoutPosts: MapPlace[] = rawPlaces
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      id: p.id,
      nameEn: p.nameEn ?? p.nameKo ?? "",
      nameKo: p.nameKo,
      latitude: p.latitude!,
      longitude: p.longitude!,
      rating: p.rating,
      addressKo: p.addressKo,
      addressEn: p.addressEn,
      googleMapsUrl: p.googleMapsUrl,
      naverMapsUrl: p.naverMapsUrl,
      imageUrl: p.imageUrl,
      phone: p.phone,
      operatingHours: p.operatingHours as string[] | null,
      area: p.area ?? null,
      placeImages: p.placeImages,
      posts: [],
    }));

  return [...placesWithPosts, ...placesWithoutPosts];
}

/** PUBLISHED 포스트가 연결된 모든 장소 (lat/lng 있는 것만) */
export async function getAllMapPlaces(): Promise<MapPlace[]> {
  const rows = await fetchPostPlaceRows({
    post: { status: "PUBLISHED" },
    place: {
      latitude: { not: null },
      longitude: { not: null },
    },
  });
  return groupByPlace(rows);
}

/** 특정 유저가 저장한 포스트가 연결된 장소 */
export async function getSavedMapPlaces(userId: string): Promise<MapPlace[]> {
  const saved = await prisma.save.findMany({
    where: { userId, targetType: "POST" },
    select: { targetId: true },
  });
  if (saved.length === 0) return [];
  const savedPostIds = saved.map((s) => s.targetId);

  const rows = await fetchPostPlaceRows({
    postId: { in: savedPostIds },
    post: { status: "PUBLISHED" },
    place: {
      latitude: { not: null },
      longitude: { not: null },
    },
  });
  return groupByPlace(rows);
}
