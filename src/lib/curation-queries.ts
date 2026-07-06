// 큐레이션 섹션 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import type { CuratedSection } from "@prisma/client";
import type { CuratedSectionWithSlug, SectionData } from "@/lib/curation-types";

export type { SectionData, CuratedSectionWithSlug } from "@/lib/curation-types";
export { getPostMoreHref } from "@/lib/curation-types";

// ─── 섹션 목록 조회 ───────────────────────────────────────────────────────────

/**
 * isActive: true인 섹션을 order: asc 순으로 반환.
 * showOnHome: true 를 넘기면 홈 노출 조건 추가.
 * Discover에서는 getCuratedSections({}) 로 호출.
 */
export async function getCuratedSections(opts: { showOnHome?: boolean }): Promise<CuratedSectionWithSlug[]> {
  return prisma.curatedSection.findMany({
    where: {
      isActive: true,
      ...(opts.showOnHome ? { showOnHome: true } : {}),
    },
    orderBy: { order: "asc" },
    include: {
      filterTopic: { select: { slug: true } },
      filterTag: { select: { slug: true } },
    },
  });
}

// ─── 섹션별 콘텐츠 조회 ───────────────────────────────────────────────────────

/**
 * 섹션 배열을 받아 각 섹션의 포스트/recreeshot 데이터를 병렬 조회.
 * MANUAL: postIds 순서 보존. AUTO_HOT: viewCount desc. AUTO_NEW: createdAt desc.
 */
export async function getSectionData(sections: CuratedSection[]): Promise<SectionData[]> {
  return Promise.all(
    sections.map(async (section): Promise<SectionData> => {
      const regionAreaFilter = section.filterRegion
        ? {
            OR: [
              { level: 0, nameEn: { equals: section.filterRegion, mode: "insensitive" as const } },
              { level: 1, parent: { nameEn: { equals: section.filterRegion, mode: "insensitive" as const } } },
            ],
          }
        : null;

      if (section.contentType === "RECREESHOT") {
        const items = await prisma.reCreeshot.findMany({
          where: {
            status: "ACTIVE",
            ...(section.filterTopicId
              ? { reCreeshotTopics: { some: { topicId: section.filterTopicId } } }
              : {}),
            ...(section.filterTagId
              ? { reCreeshotTags: { some: { tagId: section.filterTagId } } }
              : section.filterTagGroup
              ? { reCreeshotTags: { some: { tag: { group: section.filterTagGroup } } } }
              : {}),
            ...(regionAreaFilter ? { place: { area: regionAreaFilter } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: section.maxCount,
          select: { id: true, imageUrl: true, referencePhotoUrl: true },
        });
        return { kind: "reCreeshots", items };
      }

      // postIds가 지정된 경우(MANUAL 또는 AUTO 고정 순서): 해당 포스트를 그 순서로 표시
      if (section.postIds.length > 0) {
        const posts = await getPostsWithLabels({
          id: { in: section.postIds },
          status: "PUBLISHED",
        });
        const map = new Map(posts.map((p) => [p.id, p]));
        return {
          kind: "posts",
          items: section.postIds.map((id) => map.get(id)).filter((p): p is PostItem => !!p),
        };
      }

      // MANUAL인데 postIds가 없으면 빈 섹션
      if (section.type === "MANUAL") return { kind: "posts", items: [] };

      // AUTO: 필터 + 자동 정렬
      const items = await getPostsWithLabels(
        {
          status: "PUBLISHED",
          ...(section.filterTopicId
            ? { postTopics: { some: { topicId: section.filterTopicId } } }
            : {}),
          ...(section.filterTagId
            ? { postTags: { some: { tagId: section.filterTagId } } }
            : section.filterTagGroup
            ? { postTags: { some: { tag: { group: section.filterTagGroup } } } }
            : {}),
          ...(regionAreaFilter ? { postPlaces: { some: { place: { area: regionAreaFilter } } } } : {}),
        },
        {
          take: section.maxCount,
          orderBy: section.type === "AUTO_HOT" ? { viewCount: "desc" } : { createdAt: "desc" },
        }
      );
      return { kind: "posts", items };
    })
  );
}
