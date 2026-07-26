import type { Level0TopicDeep } from "./topic-queries";
import type { TagGroupWithTags } from "./filter-queries";
import type { MarkerGradient } from "./map-utils";

export interface FilterState {
  topicIds: string[];
  tagIds: string[];
  tagGroupKeys: string[];
  region: string | null;
}

export interface FilterLookups {
  topicTree: Level0TopicDeep[];
  tagGroups: TagGroupWithTags[];
}

// ExploreMapView의 칩 레벨 결정 로직과 동일 (KPOP은 L2, 나머지는 L2 또는 L1)
export const KPOP_NAME = "K-POP";

function topicSlugToId(topicTree: Level0TopicDeep[], slug: string): string | null {
  for (const root of topicTree) {
    const l1s = root.children;
    if (l1s.length === 0) continue;
    if (root.nameEn === KPOP_NAME) {
      for (const l1 of l1s)
        for (const l2 of l1.children)
          if (l2.slug === slug) return l2.id;
      continue;
    }
    const hasL2 = l1s.some((l1) => l1.children.length > 0);
    if (!hasL2) {
      for (const l1 of l1s)
        if (l1.slug === slug) return l1.id;
    } else {
      for (const l1 of l1s)
        for (const l2 of l1.children)
          if (l2.slug === slug) return l2.id;
    }
  }
  return null;
}

// topicTree 각 레벨(L0~L3)이 공통으로 갖는 필드만 뽑은 구조적 타입 — 재귀 순회를 레벨 무관하게 공유하기 위함
type TopicTreeNode = {
  id: string;
  slug: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  children?: readonly TopicTreeNode[];
};

// children을 타고 내려가며 id가 일치하는 노드를 찾는다 (topicIdToSlug/buildTopicColorMap 공용)
function findTopicNode(nodes: readonly TopicTreeNode[], id: string): TopicTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findTopicNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function topicIdToSlug(topicTree: Level0TopicDeep[], id: string): string | null {
  return findTopicNode(topicTree, id)?.slug ?? null;
}

// 노드 자신의 colorHex가 null이 아니면(빈 문자열도 포함) 자기 색을 쓰고, null이면 부모(inherited)의 색을 물려받는다
// — resolveTopicColorHex(map-utils.ts)와 동일하게 nullish 기준으로 판단
function inheritedMarkerGradient(
  node: { colorHex: string | null; colorHex2: string | null; gradientDir: string; gradientStop: number },
  inherited: MarkerGradient | undefined
): MarkerGradient | undefined {
  return node.colorHex !== null
    ? { colorHex: node.colorHex, colorHex2: node.colorHex2, gradientDir: node.gradientDir, gradientStop: node.gradientStop }
    : inherited;
}

/** topicTree(L0~L3) 전체를 한 번만 순회하며 모든 노드의 id → 상속 완료된 MarkerGradient 맵을 만든다 */
export function buildTopicColorMap(topicTree: Level0TopicDeep[]): Map<string, MarkerGradient> {
  const map = new Map<string, MarkerGradient>();

  function visit(nodes: readonly TopicTreeNode[], inherited: MarkerGradient | undefined) {
    for (const node of nodes) {
      const resolved = inheritedMarkerGradient(node, inherited);
      if (resolved) map.set(node.id, resolved);
      if (node.children) visit(node.children, resolved);
    }
  }

  visit(topicTree, undefined);
  return map;
}

function tagSlugToId(tagGroups: TagGroupWithTags[], slug: string): string | null {
  for (const group of tagGroups)
    for (const tag of group.tags)
      if (tag.slug === slug) return tag.id;
  return null;
}

function tagIdToSlug(tagGroups: TagGroupWithTags[], id: string): string | null {
  for (const group of tagGroups)
    for (const tag of group.tags)
      if (tag.id === id) return tag.slug;
  return null;
}

/**
 * URL searchParams → FilterState
 * - ?topics=bts,twice  → topicIds (slug → id 변환, 못 찾은 slug 버림)
 * - ?tags=concert      → tagIds   (slug → id 변환, 못 찾은 slug 버림)
 * - ?region=seoul      → region   (문자열 그대로, 없으면 null)
 */
export function parseFilterParams(
  searchParams: URLSearchParams,
  topicTree: Level0TopicDeep[],
  tagGroups: TagGroupWithTags[]
): FilterState {
  const rawTopics = searchParams.get("topics");
  const rawTags = searchParams.get("tags");
  const rawTagGroups = searchParams.get("tagGroups");
  const rawRegion = searchParams.get("region");

  const topicSlugs = rawTopics ? rawTopics.split(",").filter(Boolean) : [];
  const tagSlugs = rawTags ? rawTags.split(",").filter(Boolean) : [];
  const rawTagGroupKeys = rawTagGroups ? rawTagGroups.split(",").filter(Boolean) : [];

  const topicIds = topicSlugs
    .map((slug) => topicSlugToId(topicTree, slug))
    .filter((id): id is string => id !== null);

  const tagIds = tagSlugs
    .map((slug) => tagSlugToId(tagGroups, slug))
    .filter((id): id is string => id !== null);

  const validGroupKeys = new Set(tagGroups.map((g) => g.group));
  const tagGroupKeys = rawTagGroupKeys.filter((k) => validGroupKeys.has(k));

  return { topicIds, tagIds, tagGroupKeys, region: rawRegion || null };
}

/**
 * FilterState → URLSearchParams
 * - currentParams를 복사해서 시작 (saved/collection/place 등 기존 param 보존)
 * - topicIds → slug → "topics"에 set, 비면 delete
 * - tagIds   → slug → "tags"에   set, 비면 delete
 * - region   → "region"에 set,       null이면 delete
 */
export function serializeFilterParams(
  state: FilterState,
  lookups: FilterLookups,
  currentParams: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(currentParams);

  const topicSlugs = state.topicIds
    .map((id) => topicIdToSlug(lookups.topicTree, id))
    .filter((slug): slug is string => slug !== null);

  if (topicSlugs.length > 0) {
    params.set("topics", topicSlugs.join(","));
  } else {
    params.delete("topics");
  }

  const tagSlugs = state.tagIds
    .map((id) => tagIdToSlug(lookups.tagGroups, id))
    .filter((slug): slug is string => slug !== null);

  if (tagSlugs.length > 0) {
    params.set("tags", tagSlugs.join(","));
  } else {
    params.delete("tags");
  }

  if (state.tagGroupKeys.length > 0) {
    params.set("tagGroups", state.tagGroupKeys.join(","));
  } else {
    params.delete("tagGroups");
  }

  if (state.region !== null) {
    params.set("region", state.region);
  } else {
    params.delete("region");
  }

  return params;
}

/**
 * slug를 직접 받아 Discover URL을 조립.
 * slug→id 변환 없이 URL 파라미터 이름만 중앙화.
 */
export function buildDiscoverHref(opts: {
  topicSlugs?: string[];
  tagSlugs?: string[];
  tagGroupKeys?: string[];
  region?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.topicSlugs?.length) params.set("topics", opts.topicSlugs.join(","));
  if (opts.tagSlugs?.length) params.set("tags", opts.tagSlugs.join(","));
  if (opts.tagGroupKeys?.length) params.set("tagGroups", opts.tagGroupKeys.join(","));
  if (opts.region) params.set("region", opts.region);
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}
