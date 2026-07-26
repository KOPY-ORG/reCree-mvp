// Discover 필터 pure 헬퍼 — React 의존성 없음, 클라이언트/서버 무관
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { topicMatchesFilter } from "@/lib/map-utils";
import { getPlaceRegionSlug } from "@/lib/region-utils";

export function postMatchesFilters(post: MapPost, topicIds: string[], tagIds: string[], tagGroupKeys: string[]): boolean {
  const topicHit =
    topicIds.length > 0 &&
    post.topics.some((t) => topicIds.some((id) => topicMatchesFilter(t, id)));
  const tagHit = tagIds.length > 0 && post.tags.some((tag) => tagIds.includes(tag.id));
  const groupHit = tagGroupKeys.length > 0 && post.allTagGroups.some((g) => tagGroupKeys.includes(g));
  return topicHit || tagHit || groupHit;
}

export function placeMatchesFilters(
  place: Pick<MapPlace, "id" | "posts" | "area">,
  hasPostLevelFilter: boolean,
  matchedPostsByPlaceId: Map<string, MapPost[]>,
  region: string | null
): boolean {
  if (region !== null && getPlaceRegionSlug(place.area) !== region) return false;
  if (!hasPostLevelFilter) return true;
  return (matchedPostsByPlaceId.get(place.id)?.length ?? 0) > 0;
}

// 토픽 매칭은 항상 태그보다 위. 같은 급 안에서는 먼저 선택한 필터 기준.
// 합산이 아닌 "가장 먼저 선택된 매칭"의 index만 사용해 선택 순서가 다중 매칭 누적에 묻히지 않도록.
const TOPIC_BASE = 1000;
const TAG_BASE = 1;
export function placeMatchScore(
  place: Pick<MapPlace, "posts">,
  topicIds: string[],
  tagIds: string[]
): number {
  const bestTopicIdx = topicIds.findIndex((id) =>
    place.posts.some((post) => post.topics.some((t) => topicMatchesFilter(t, id)))
  );
  if (bestTopicIdx !== -1) return TOPIC_BASE + (topicIds.length - bestTopicIdx);

  const bestTagIdx = tagIds.findIndex((id) =>
    place.posts.some((post) => post.tags.some((tag) => tag.id === id))
  );
  if (bestTagIdx !== -1) return TAG_BASE + (tagIds.length - bestTagIdx);

  return 0;
}
