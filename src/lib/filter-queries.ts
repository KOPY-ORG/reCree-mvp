// 필터 적용 Post 조회 + TagGroup 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels } from "@/lib/post-queries";
import { getDescendantTopicIds } from "@/lib/topic-queries";

export async function getFilteredPosts(params: {
  q?: string;
  topicId?: string;
  tagId?: string;
}) {
  const AND: object[] = [{ status: "PUBLISHED" }];

  if (params.topicId) {
    const topicIds = await getDescendantTopicIds(params.topicId);
    AND.push({ postTopics: { some: { topicId: { in: topicIds } } } });
  }
  if (params.tagId) {
    AND.push({ postTags: { some: { tagId: params.tagId } } });
  }
  if (params.q) {
    AND.push({
      OR: [
        // 포스트 제목
        { titleEn: { contains: params.q, mode: "insensitive" } },
        { titleKo: { contains: params.q, mode: "insensitive" } },
        // Story (본문)
        { bodyEn: { contains: params.q, mode: "insensitive" } },
        // 토픽/태그
        {
          postTopics: {
            some: { topic: { nameEn: { contains: params.q, mode: "insensitive" } } },
          },
        },
        {
          postTags: {
            some: { tag: { name: { contains: params.q, mode: "insensitive" } } },
          },
        },
        // 장소명 (영문/한글)
        {
          postPlaces: {
            some: { place: { nameEn: { contains: params.q, mode: "insensitive" } } },
          },
        },
        {
          postPlaces: {
            some: { place: { nameKo: { contains: params.q, mode: "insensitive" } } },
          },
        },
        // Spot Insight
        {
          postPlaces: {
            some: { context: { contains: params.q, mode: "insensitive" } },
          },
        },
        {
          postPlaces: {
            some: { mustTry: { contains: params.q, mode: "insensitive" } },
          },
        },
        {
          postPlaces: {
            some: { tip: { contains: params.q, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  return getPostsWithLabels({ AND }, { orderBy: { publishedAt: "desc" } });
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
