// 필터 적용 Post 조회 + TagGroup 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels } from "@/lib/post-queries";
import { getDescendantTopicIds } from "@/lib/topic-queries";

export async function getFilteredPosts(params: {
  q?: string;
  topicIds?: string[];
  tagIds?: string[];
  tagGroupName?: string;
}) {
  const AND: object[] = [{ status: "PUBLISHED" }];

  if (params.topicIds?.length) {
    for (const topicId of params.topicIds) {
      const ids = await getDescendantTopicIds(topicId);
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
  if (params.q) {
    const words = params.q.trim().split(/\s+/).filter(Boolean);
    for (const w of words) {
      AND.push({
        OR: [
          { titleEn: { contains: w, mode: "insensitive" } },
          { titleKo: { contains: w, mode: "insensitive" } },
          { bodyEn: { contains: w, mode: "insensitive" } },
          { postTopics: { some: { topic: { nameEn: { contains: w, mode: "insensitive" } } } } },
          { postTags: { some: { tag: { name: { contains: w, mode: "insensitive" } } } } },
          { postPlaces: { some: { place: { nameEn: { contains: w, mode: "insensitive" } } } } },
          { postPlaces: { some: { place: { nameKo: { contains: w, mode: "insensitive" } } } } },
          { postPlaces: { some: { context: { contains: w, mode: "insensitive" } } } },
          { postPlaces: { some: { mustTry: { contains: w, mode: "insensitive" } } } },
          { postPlaces: { some: { tip: { contains: w, mode: "insensitive" } } } },
        ],
      });
    }
  }

  const posts = await getPostsWithLabels({ AND }, { orderBy: { publishedAt: "desc" } });

  if (!params.q) return posts;

  const words = params.q.trim().split(/\s+/).filter(Boolean).map((w) => w.toLowerCase());
  const priorityIds = await prisma.post.findMany({
    where: {
      id: { in: posts.map((p) => p.id) },
      OR: [
        {
          postTopics: {
            some: {
              isVisible: true,
              topic: { nameEn: { in: words, mode: "insensitive" } },
            },
          },
        },
        {
          postTags: {
            some: {
              isVisible: true,
              tag: { name: { in: words, mode: "insensitive" } },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  const prioritySet = new Set(priorityIds.map((p) => p.id));

  return [
    ...posts.filter((p) => prioritySet.has(p.id)),
    ...posts.filter((p) => !prioritySet.has(p.id)),
  ];
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
