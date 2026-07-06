import type { CuratedSection } from "@prisma/client";
import type { PostItem } from "@/lib/post-queries";
import { buildDiscoverHref } from "@/lib/filter-params";

export type SectionData =
  | { kind: "posts"; items: PostItem[] }
  | { kind: "reCreeshots"; items: { id: string; imageUrl: string; referencePhotoUrl: string | null }[] };

export type CuratedSectionWithSlug = CuratedSection & {
  filterTopic: { slug: string } | null;
  filterTag: { slug: string } | null;
};

/**
 * 섹션의 타입·필터 조건을 기반으로 "더보기" href를 반환.
 * MANUAL → /discover, AUTO → /discover?{filter}
 */
export function getPostMoreHref(section: CuratedSectionWithSlug): string {
  if (section.type === "MANUAL") return "/discover";
  const topicSlugs = section.filterTopicId && section.filterTopic?.slug ? [section.filterTopic.slug] : [];
  const tagSlugs = section.filterTagId && section.filterTag?.slug ? [section.filterTag.slug] : [];
  // filterTagId 없을 때만 그룹 폴백 (getSectionData의 우선순위와 동일)
  const tagGroupKeys = !section.filterTagId && section.filterTagGroup ? [section.filterTagGroup] : [];
  if (topicSlugs.length === 0 && tagSlugs.length === 0 && tagGroupKeys.length === 0 && !section.filterRegion) return "/discover";
  return buildDiscoverHref({ topicSlugs, tagSlugs, tagGroupKeys, region: section.filterRegion || undefined });
}
