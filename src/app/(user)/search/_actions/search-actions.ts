"use server";

import { prisma } from "@/lib/prisma";

export type Suggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; slug: string; placeName?: string };

export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  if (!term) return [];

  const [topics, tags, places, postsByTitle, postsByTopic, postsByTag] = await Promise.all([
    prisma.topic.findMany({
      where: { nameEn: { contains: term, mode: "insensitive" }, isActive: true },
      select: { nameEn: true },
      take: 4,
    }),
    prisma.tag.findMany({
      where: { name: { contains: term, mode: "insensitive" }, isActive: true },
      select: { name: true },
      take: 4,
    }),
    prisma.place.findMany({
      where: {
        OR: [
          { nameEn: { contains: term, mode: "insensitive" } },
          { nameKo: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { nameEn: true, nameKo: true },
      take: 4,
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { titleEn: { contains: term, mode: "insensitive" } },
          { titleKo: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        postTopics: {
          some: { topic: { nameEn: { contains: term, mode: "insensitive" }, isActive: true } },
        },
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        postTags: {
          some: { tag: { name: { contains: term, mode: "insensitive" }, isActive: true } },
        },
      },
      select: {
        titleEn: true,
        slug: true,
        postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
      },
      take: 4,
    }),
  ]);

  const keywordItems: Suggestion[] = [
    ...topics.map((t): Suggestion => ({ type: "keyword", text: t.nameEn })),
    ...tags.map((t): Suggestion => ({ type: "keyword", text: t.name })),
    ...places
      .map((p) => p.nameEn ?? p.nameKo ?? "")
      .filter((text): text is string => Boolean(text))
      .map((text): Suggestion => ({ type: "keyword", text })),
  ];

  const postItems: Suggestion[] = [...postsByTitle, ...postsByTopic, ...postsByTag]
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
