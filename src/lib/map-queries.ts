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
        },
      },
      post: {
        select: {
          id: true,
          slug: true,
          titleEn: true,
          postImages: {
            where: { isThumbnail: true },
            select: { url: true },
            take: 1,
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

    const mapPost: MapPost = {
      id: post.id,
      slug: post.slug,
      titleEn: post.titleEn,
      imageUrl: post.postImages[0]?.url ?? null,
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
        posts: [mapPost],
      });
    }
  }
  return Array.from(map.values());
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
