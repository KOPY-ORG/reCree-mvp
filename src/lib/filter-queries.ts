// 필터 적용 Post 조회 + TagGroup 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels } from "@/lib/post-queries";
import { getDescendantTopicIds } from "@/lib/topic-queries";
import { parseSearchWords } from "@/lib/search-utils";

export async function getFilteredPosts(params: {
  q?: string;
  topicIds?: string[];
  tagIds?: string[];
  tagGroupName?: string;
}) {
  const AND: object[] = [{ status: "PUBLISHED" }];

  // 하위 토픽 ID 미리 계산 (이후 정렬에서도 재사용)
  const expandedTopicIdSets: string[][] = [];
  if (params.topicIds?.length) {
    for (const topicId of params.topicIds) {
      const ids = await getDescendantTopicIds(topicId);
      expandedTopicIdSets.push(ids);
      AND.push({ postTopics: { some: { topicId: { in: ids } } } });
    }
  }
  if (params.tagIds?.length) {
    for (const tagId of params.tagIds) {
      AND.push({ postTags: { some: { tagId } } });
    }
  }
  if (params.tagGroupName) {
    const groupTags = await prisma.tag.findMany({
      where: { group: params.tagGroupName, isActive: true },
      select: { id: true },
    });
    if (groupTags.length > 0) {
      AND.push({ postTags: { some: { tagId: { in: groupTags.map((t) => t.id) } } } });
    }
  }
  const searchWords = params.q ? parseSearchWords(params.q) : [];

  if (searchWords.length === 0) {
    return getPostsWithLabels({ AND }, { orderBy: { createdAt: "desc" } });
  }

  // 각 단어에 대해 매칭 토픽 ID(하위 토픽 포함) 사전 계산
  const wordTopicIds = await Promise.all(
    searchWords.map(async (w) => {
      const matchingTopics = await prisma.topic.findMany({
        where: { nameEn: { contains: w, mode: "insensitive" }, isActive: true },
        select: { id: true },
      });
      if (matchingTopics.length === 0) return [];
      const allIds = await Promise.all(matchingTopics.map((t) => getDescendantTopicIds(t.id)));
      return [...new Set(allIds.flat())];
    })
  );

  // 토픽 계층 포함 단어 조건
  const wordConditionWithTopics = (w: string, topicIds: string[]) => ({
    OR: [
      { titleEn: { contains: w, mode: "insensitive" as const } },
      { titleKo: { contains: w, mode: "insensitive" as const } },
      { bodyEn: { contains: w, mode: "insensitive" as const } },
      ...(topicIds.length > 0
        ? [{ postTopics: { some: { topicId: { in: topicIds } } } }]
        : [{ postTopics: { some: { topic: { nameEn: { contains: w, mode: "insensitive" as const } } } } }]
      ),
      { postTags: { some: { tag: { name: { contains: w, mode: "insensitive" as const } } } } },
      { postPlaces: { some: { place: { nameEn: { contains: w, mode: "insensitive" as const } } } } },
      { postPlaces: { some: { place: { nameKo: { contains: w, mode: "insensitive" as const } } } } },
      { postPlaces: { some: { context: { contains: w, mode: "insensitive" as const } } } },
      { postPlaces: { some: { mustTry: { contains: w, mode: "insensitive" as const } } } },
      { postPlaces: { some: { tip: { contains: w, mode: "insensitive" as const } } } },
    ],
  });

  const enrichedConditions = searchWords.map((w, i) => wordConditionWithTopics(w, wordTopicIds[i]));

  // 토픽·태그 전용 조건 (1차 점수용 — 구조적 매칭)
  const structuredCondition = (w: string, topicIds: string[]) => ({
    OR: [
      ...(topicIds.length > 0
        ? [{ postTopics: { some: { topicId: { in: topicIds } } } }]
        : [{ postTopics: { some: { topic: { nameEn: { contains: w, mode: "insensitive" as const } } } } }]
      ),
      { postTags: { some: { tag: { name: { contains: w, mode: "insensitive" as const } } } } },
    ],
  });

  // 1차(구조적) / 2차(대표 토픽) / 3차(전체) 점수 병렬 집계
  const structuredScores = new Map<string, number>();
  const representativeScores = new Map<string, number>();
  const totalScores = new Map<string, number>();

  await Promise.all(
    searchWords.map(async (w, i) => {
      const topicIds = wordTopicIds[i];
      const [structuredHits, repHits, fullHits] = await Promise.all([
        prisma.post.findMany({
          where: { AND: [...AND, structuredCondition(w, topicIds)] },
          select: { slug: true },
        }),
        // 검색어가 대표 토픽(displayOrder 0)으로 매칭되는 포스트
        topicIds.length > 0
          ? prisma.post.findMany({
              where: { AND: [...AND, { postTopics: { some: { topicId: { in: topicIds }, displayOrder: 0 } } }] },
              select: { slug: true },
            })
          : Promise.resolve([]),
        prisma.post.findMany({
          where: { AND: [...AND, enrichedConditions[i]] },
          select: { slug: true },
        }),
      ]);
      for (const { slug } of structuredHits) {
        structuredScores.set(slug, (structuredScores.get(slug) ?? 0) + 1);
      }
      for (const { slug } of repHits) {
        representativeScores.set(slug, (representativeScores.get(slug) ?? 0) + 1);
      }
      for (const { slug } of fullHits) {
        totalScores.set(slug, (totalScores.get(slug) ?? 0) + 1);
      }
    })
  );

  if (totalScores.size === 0) return [];

  // 매칭 포스트 전체 조회
  AND.push({ OR: enrichedConditions });
  const posts = await getPostsWithLabels({ AND }, { orderBy: { createdAt: "desc" } });

  // 1차: 구조적 점수(토픽·태그), 2차: 대표 토픽 매칭, 3차: 전체 점수, 4차: 최신순
  return posts.sort((a, b) => {
    const sa1 = structuredScores.get(a.slug) ?? 0;
    const sb1 = structuredScores.get(b.slug) ?? 0;
    if (sb1 !== sa1) return sb1 - sa1;
    const ra = representativeScores.get(a.slug) ?? 0;
    const rb = representativeScores.get(b.slug) ?? 0;
    if (rb !== ra) return rb - ra;
    const tc = (totalScores.get(b.slug) ?? 0) - (totalScores.get(a.slug) ?? 0);
    if (tc !== 0) return tc;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/** TagGroup + 소속 Tag 목록 (Explore 필터 Row 2용) */
export async function getTagGroupsWithTags() {
  const [tagGroups, tags] = await Promise.all([
    prisma.tagGroupConfig.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        group: true,
        colorHex: true,
        colorHex2: true,
        textColorHex: true,
      },
    }),
  ]);

  return tagGroups.map((group) => ({
    ...group,
    tags: tags.filter((tag) => tag.group === group.group),
  }));
}

export type TagGroupWithTags = Awaited<ReturnType<typeof getTagGroupsWithTags>>[number];
