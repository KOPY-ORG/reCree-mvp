"use server";

import { prisma } from "@/lib/prisma";

export type Suggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; slug: string; placeName?: string };

export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  if (!term) return [];

  const words = term.split(/\s+/).filter(Boolean);

  const [topics, tags, postsByTitle, postsByTopic, postsByTag, postsByPlace] = await Promise.all([
    prisma.topic.findMany({
      where: {
        AND: words.map((w) => ({ nameEn: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { nameEn: true },
      take: 20,
    }),
    prisma.tag.findMany({
      where: {
        AND: words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { name: true },
      take: 20,
    }),
    // 포스트 타이틀 매칭
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        AND: words.map((w) => ({
          OR: [
            { titleEn: { contains: w, mode: "insensitive" as const } },
            { titleKo: { contains: w, mode: "insensitive" as const } },
          ],
        })),
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
    // 매칭된 토픽에 연결된 포스트
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        AND: words.map((w) => ({
          postTopics: {
            some: { topic: { nameEn: { contains: w, mode: "insensitive" as const }, isActive: true } },
          },
        })),
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
    // 매칭된 태그에 연결된 포스트
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        AND: words.map((w) => ({
          postTags: {
            some: { tag: { name: { contains: w, mode: "insensitive" as const }, isActive: true } },
          },
        })),
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
    // 매칭된 장소에 연결된 포스트
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        AND: words.map((w) => ({
          postPlaces: {
            some: {
              place: {
                OR: [
                  { nameEn: { contains: w, mode: "insensitive" as const } },
                  { nameKo: { contains: w, mode: "insensitive" as const } },
                ],
              },
            },
          },
        })),
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
  ]);

  function sortByRelevance<T extends { text: string }>(items: T[]): T[] {
    const lowerTerm = term.toLowerCase();
    return [...items].sort((a, b) => {
      const aExact = a.text.toLowerCase() === lowerTerm ? 0 : 1;
      const bExact = b.text.toLowerCase() === lowerTerm ? 0 : 1;
      return aExact - bExact || a.text.length - b.text.length;
    });
  }

  const keywordItems: Suggestion[] = sortByRelevance([
    ...topics.map((t): Suggestion => ({ type: "keyword", text: t.nameEn })),
    ...tags.map((t): Suggestion => ({ type: "keyword", text: t.name })),
  ]).slice(0, 3);

  const postItems: Suggestion[] = [
    ...postsByTitle,
    ...postsByTopic,
    ...postsByTag,
    ...postsByPlace,
  ]
    .filter((p) => p.titleEn && p.slug)
    .map((p): Suggestion => ({
      type: "post",
      text: p.titleEn!,
      slug: p.slug!,
      placeName: p.postPlaces[0]?.place.nameEn ?? p.postPlaces[0]?.place.nameKo ?? undefined,
    }));

  const merged = new Map<string, Suggestion>();
  for (const item of keywordItems) {
    if (!merged.has(item.text)) merged.set(item.text, item);
  }
  for (const item of postItems) {
    merged.set(item.text, item);
  }

  return [...merged.values()].slice(0, 10);
}
