// Discover 필터 pure 헬퍼 — React 의존성 없음, 클라이언트/서버 무관
import type { MapPlace, MapPost } from "@/lib/map-queries";
import { topicMatchesFilter } from "@/lib/map-utils";
import { placeCategories, type PlaceCategoryChip } from "@/lib/place-types";
import { getPlaceRegionSlug, getPlaceDistrictSlug } from "@/lib/region-utils";

export function postMatchesFilters(post: MapPost, topicIds: string[], tagIds: string[], tagGroupKeys: string[]): boolean {
  const topicHit =
    topicIds.length > 0 &&
    post.topics.some((t) => topicIds.some((id) => topicMatchesFilter(t, id)));
  const tagHit = tagIds.length > 0 && post.tags.some((tag) => tagIds.includes(tag.id));
  const groupHit = tagGroupKeys.length > 0 && post.allTagGroups.some((g) => tagGroupKeys.includes(g));
  return topicHit || tagHit || groupHit;
}

export function placeMatchesFilters(
  place: Pick<MapPlace, "id" | "posts" | "area" | "placePlaceTypes">,
  hasPostLevelFilter: boolean,
  matchedPostsByPlaceId: Map<string, MapPost[]>,
  region: string | null,
  district: string | null,
  placeCategory: PlaceCategoryChip | null
): boolean {
  if (region !== null && getPlaceRegionSlug(place.area) !== region) return false;
  // 시군구는 시도를 좁힐 뿐이라 시도 비교 뒤에 온다. 시도에 직접 붙은 장소(세종)는 여기서 빠진다
  if (district !== null && getPlaceDistrictSlug(place.area) !== district) return false;
  // 카테고리는 장소의 속성이라 포스트를 보기 전에 판정한다. 한 장소가 여러 카테고리를
  // 가질 수 있어 "포함" 이다 — 카페 겸 상점은 Cafes 와 Shops 양쪽 칩에 걸린다.
  // 타입이 없는 장소(캐시된 옛 payload 포함)는 빈 목록이라 어느 칩에도 걸리지 않는다.
  if (placeCategory !== null && !placeCategories(place.placePlaceTypes).includes(placeCategory)) return false;
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
