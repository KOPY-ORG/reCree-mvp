"use server";

import { prisma } from "@/lib/prisma";

export type Suggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; slug: string; placeName?: string };

function wordAnd<T extends Record<string, unknown>>(
  words: string[],
  fieldCondition: (word: string) => T
): { AND: T[] } | T {
  if (words.length === 1) return fieldCondition(words[0]);
  return { AND: words.map(fieldCondition) };
}

export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  if (!term) return [];

  const words = term.split(/\s+/).filter(Boolean);

  const [topics, tags, places, postsByTitle, postsByTopic, postsByTag] = await Promise.all([
    // 토픽: 단일 단어만 매칭 (보통 한 단어 이름)
    prisma.topic.findMany({
      where: {
        AND: words.map((w) => ({ nameEn: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { nameEn: true },
      take: 4,
    }),
    // 태그: 단일 단어만 매칭
    prisma.tag.findMany({
      where: {
        AND: words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { name: true },
      take: 4,
    }),
    // 장소: 각 단어가 nameEn 또는 nameKo에 포함
    prisma.place.findMany({
      where: {
        AND: words.map((w) => ({
          OR: [
            { nameEn: { contains: w, mode: "insensitive" as const } },
            { nameKo: { contains: w, mode: "insensitive" as const } },
          ],
        })),
      },
      select: { nameEn: true, nameKo: true },
      take: 4,
    }),
    // 포스트 타이틀: 각 단어가 titleEn 또는 titleKo에 포함
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
    // 매칭된 토픽에 연결된 포스트: 각 단어가 토픽 nameEn에 포함
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
    // 매칭된 태그에 연결된 포스트: 각 단어가 태그 name에 포함
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
