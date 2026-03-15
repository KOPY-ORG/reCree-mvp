"use server";

import { prisma } from "@/lib/prisma";
import { parseSearchWords } from "@/lib/search-utils";
import { getMapPlacesByIds } from "@/lib/map-queries";
import type { MapPlace } from "@/lib/map-queries";

export async function searchMapPlaces(q: string): Promise<MapPlace[]> {
  const words = parseSearchWords(q);
  if (!words.length) return [];

  // 각 단어별로 매칭되는 placeId 목록 수집
  const wordMatchResults = await Promise.all(
    words.map((word) =>
      prisma.place.findMany({
        where: {
          AND: [
            { latitude: { not: null } },
            { longitude: { not: null } },
            {
              OR: [
                { nameEn: { contains: word, mode: "insensitive" } },
                { nameKo: { contains: word, mode: "insensitive" } },
                { city: { contains: word, mode: "insensitive" } },
                { addressEn: { contains: word, mode: "insensitive" } },
                {
                  postPlaces: {
                    some: {
                      post: {
                        status: "PUBLISHED",
                        OR: [
                          { titleEn: { contains: word, mode: "insensitive" } },
                          { titleKo: { contains: word, mode: "insensitive" } },
                          {
                            postTopics: {
                              some: {
                                topic: {
                                  nameEn: { contains: word, mode: "insensitive" },
                                  isActive: true,
                                },
                              },
                            },
                          },
                          {
                            postTags: {
                              some: {
                                tag: {
                                  name: { contains: word, mode: "insensitive" },
                                  isActive: true,
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        select: { id: true },
      })
    )
  );

  // 매칭된 단어 수로 스코어링
  const scoreMap = new Map<string, number>();
  for (const places of wordMatchResults) {
    for (const place of places) {
      scoreMap.set(place.id, (scoreMap.get(place.id) ?? 0) + 1);
    }
  }
  if (scoreMap.size === 0) return [];

  // 스코어 내림차순 정렬
  const sortedIds = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 전체 장소 데이터 조회
  const places = await getMapPlacesByIds(sortedIds);

  // 스코어 순서 유지
  const placeMap = new Map(places.map((p) => [p.id, p]));
  return sortedIds.map((id) => placeMap.get(id)).filter(Boolean) as MapPlace[];
}
