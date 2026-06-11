// 큐레이션 섹션 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import type { CuratedSection } from "@prisma/client";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type SectionData =
  | { kind: "posts"; items: PostItem[] }
  | { kind: "reCreeshots"; items: { id: string; imageUrl: string; referencePhotoUrl: string | null }[] };

// ─── 섹션 목록 조회 ───────────────────────────────────────────────────────────

/**
 * isActive: true인 섹션을 order: asc 순으로 반환.
 * showOnHome: true 를 넘기면 홈 노출 조건 추가.
 * Discover에서는 getCuratedSections({}) 로 호출.
 */
export type CuratedSectionWithSlug = CuratedSection & {
  filterTopic: { slug: string } | null;
  filterTag: { slug: string } | null;
};

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

// ─── 더보기 링크 ──────────────────────────────────────────────────────────────

/**
 * 섹션의 타입·필터 조건을 기반으로 "더보기" href를 반환.
 * MANUAL → /discover, AUTO → /discover?{filter}
 */
export function getPostMoreHref(section: CuratedSectionWithSlug): string {
  if (section.type === "MANUAL") return "/discover";
  if (section.filterTopicId && section.filterTopic?.slug) return `/discover?topic=${section.filterTopic.slug}`;
  if (section.filterTagId && section.filterTag?.slug) return `/discover?tag=${section.filterTag.slug}`;
  return "/discover";
}
