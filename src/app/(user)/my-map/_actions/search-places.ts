"use server";

import { prisma } from "@/lib/prisma";
import { parseSearchWords } from "@/lib/search-utils";
import { getMapPlacesByIdsWithFallback } from "@/lib/map-queries";
import type { MapPlace } from "@/lib/map-queries";

export async function searchMapPlaces(q: string): Promise<MapPlace[]> {
  const words = parseSearchWords(q);
  if (!words.length) return [];

  const baseWhere = { latitude: { not: null }, longitude: { not: null } };

  // 단어별 매칭 ID 세트 + 스코어맵
  const wordMatchSets: Set<string>[] = [];
  const scoreMap = new Map<string, number>();
  const addScores = (ids: string[], weight: number, wordIdx: number) => {
    for (const id of ids) {
      scoreMap.set(id, (scoreMap.get(id) ?? 0) + weight);
      wordMatchSets[wordIdx].add(id);
    }
  };

  await Promise.all(
    words.map(async (word, wordIdx) => {
      wordMatchSets[wordIdx] = new Set<string>();
      // placeTypes 대소문자 변형 (정확 일치 배열이라 변형 필요)
      const variants = [...new Set([
        word,
        word.toLowerCase(),
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      ])];

      // 이름 매칭 — weight 3
      const nameMatches = await prisma.place.findMany({
        where: {
          AND: [
            baseWhere,
            { OR: [
              { nameEn: { contains: word, mode: "insensitive" } },
              { nameKo: { contains: word, mode: "insensitive" } },
            ]},
          ],
        },
        select: { id: true },
      });
      addScores(nameMatches.map((p) => p.id), 3, wordIdx);

      // 지역 / 장소 유형 매칭 — weight 2
      const areaTypeMatches = await prisma.place.findMany({
        where: {
          AND: [
            baseWhere,
            { OR: [
              { placeTypes: { hasSome: variants } },
              { area: { nameKo: { contains: word, mode: "insensitive" } } },
              { area: { nameEn: { contains: word, mode: "insensitive" } } },
              { area: { parent: { nameKo: { contains: word, mode: "insensitive" } } } },
              { area: { parent: { nameEn: { contains: word, mode: "insensitive" } } } },
            ]},
          ],
        },
        select: { id: true },
      });
      addScores(areaTypeMatches.map((p) => p.id), 2, wordIdx);

      // 주소 / 포스트 콘텐츠 매칭 — weight 1
      const contentMatches = await prisma.place.findMany({
        where: {
          AND: [
            baseWhere,
            { OR: [
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
                              topic: { nameEn: { contains: word, mode: "insensitive" }, isActive: true },
                            },
                          },
                        },
                        {
                          postTags: {
                            some: {
                              tag: { name: { contains: word, mode: "insensitive" }, isActive: true },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ]},
          ],
        },
        select: { id: true },
      });
      addScores(contentMatches.map((p) => p.id), 1, wordIdx);
    }),
  );

  if (scoreMap.size === 0) return [];

  // AND: 모든 단어에 매칭된 장소만 포함
  const sortedIds = [...scoreMap.entries()]
    .filter(([id]) => wordMatchSets.every((set) => set.has(id)))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const places = await getMapPlacesByIdsWithFallback(sortedIds);
  const placeMap = new Map(places.map((p) => [p.id, p]));
  return sortedIds.map((id) => placeMap.get(id)).filter(Boolean) as MapPlace[];
}
