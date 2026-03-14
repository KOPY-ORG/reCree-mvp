"use server";

import { prisma } from "@/lib/prisma";
import { parseSearchWords } from "@/lib/search-utils";

export async function getPopularSearches(): Promise<string[]> {
  const items = await prisma.popularSearch.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { keyword: true },
  });
  return items.map((i) => i.keyword);
}

export type Suggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; slug: string; placeName?: string };

export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  if (!term) return [];

  const searchWords = parseSearchWords(term);

  // 각 단어를 병렬로 크로스 필드 OR 검색
  const wordMatchResults = await Promise.all(
    searchWords.map((word) =>
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { titleEn: { contains: word, mode: "insensitive" } },
            { titleKo: { contains: word, mode: "insensitive" } },
            { postTopics: { some: { topic: { nameEn: { contains: word, mode: "insensitive" }, isActive: true } } } },
            { postTags: { some: { tag: { name: { contains: word, mode: "insensitive" }, isActive: true } } } },
            { postPlaces: { some: { place: { OR: [
              { nameEn: { contains: word, mode: "insensitive" } },
              { nameKo: { contains: word, mode: "insensitive" } },
              { city: { contains: word, mode: "insensitive" } },
            ] } } } },
          ],
        },
        select: {
          titleEn: true,
          slug: true,
          postPlaces: { select: { place: { select: { nameEn: true, nameKo: true } } }, take: 1 },
        },
        take: 20,
      })
    )
  );

  // 슬러그 기준 점수 집계 — 매칭된 단어 수가 많을수록 상위
  const scoreMap = new Map<string, { score: number; suggestion: Suggestion }>();
  for (const posts of wordMatchResults) {
    for (const post of posts) {
      if (!post.titleEn || !post.slug) continue;
      const existing = scoreMap.get(post.slug);
      if (existing) {
        existing.score++;
      } else {
        scoreMap.set(post.slug, {
          score: 1,
          suggestion: {
            type: "post",
            text: post.titleEn,
            slug: post.slug,
            placeName: post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo ?? undefined,
          },
        });
      }
    }
  }

  // 키워드 제안 (토픽/태그): 어떤 단어든 매칭되면 포함
  const [topics, tags] = await Promise.all([
    prisma.topic.findMany({
      where: {
        OR: searchWords.map((w) => ({ nameEn: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { nameEn: true },
      take: 5,
    }),
    prisma.tag.findMany({
      where: {
        OR: searchWords.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })),
        isActive: true,
      },
      select: { name: true },
      take: 5,
    }),
  ]);

  const lowerTerm = term.toLowerCase();
  const keywordItems: Suggestion[] = [
    ...topics.map((t): Suggestion => ({ type: "keyword", text: t.nameEn })),
    ...tags.map((t): Suggestion => ({ type: "keyword", text: t.name })),
  ]
    .sort((a, b) => {
      const aExact = a.text.toLowerCase() === lowerTerm ? 0 : 1;
      const bExact = b.text.toLowerCase() === lowerTerm ? 0 : 1;
      return aExact - bExact || a.text.length - b.text.length;
    })
    .slice(0, 3);

  // 점수 내림차순 정렬
  const postItems = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .map((v) => v.suggestion)
    .slice(0, 7);

  // 키워드 먼저, 포스트 뒤에 합치기
  const merged = new Map<string, Suggestion>();
  for (const item of keywordItems) {
    if (!merged.has(item.text)) merged.set(item.text, item);
  }
  for (const item of postItems) {
    if (!merged.has(item.text)) merged.set(item.text, item);
  }

  return [...merged.values()].slice(0, 10);
}
