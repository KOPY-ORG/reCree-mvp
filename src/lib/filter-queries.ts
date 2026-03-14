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
    const words = params.q.trim().split(/\s+/).filter(Boolean);
    // 각 단어마다: 제목/본문/토픽/태그/장소 중 어딘가에 포함되어야 함 (AND across words)
    for (const w of words) {
      AND.push({
        OR: [
          { titleEn: { contains: w, mode: "insensitive" } },
          { titleKo: { contains: w, mode: "insensitive" } },
          { bodyEn: { contains: w, mode: "insensitive" } },
          {
            postTopics: {
              some: { topic: { nameEn: { contains: w, mode: "insensitive" } } },
            },
          },
          {
            postTags: {
              some: { tag: { name: { contains: w, mode: "insensitive" } } },
            },
          },
          {
            postPlaces: {
              some: { place: { nameEn: { contains: w, mode: "insensitive" } } },
            },
          },
          {
            postPlaces: {
              some: { place: { nameKo: { contains: w, mode: "insensitive" } } },
            },
          },
          {
            postPlaces: {
              some: { context: { contains: w, mode: "insensitive" } },
            },
          },
          {
            postPlaces: {
              some: { mustTry: { contains: w, mode: "insensitive" } },
            },
          },
          {
            postPlaces: {
              some: { tip: { contains: w, mode: "insensitive" } },
            },
          },
        ],
      });
    }
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
