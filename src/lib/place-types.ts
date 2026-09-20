// 장소 타입 · 카테고리 헬퍼 — 클라이언트/서버 양쪽에서 쓴다
//
// 카테고리는 저장하지 않는다. 장소에 붙은 PlaceType 들에서 계산한다 (schema.prisma 의 PlaceCategory 주석).
// 그래서 화면은 언제나 "연결된 타입 목록"을 받고, 여기 헬퍼로 대표와 카테고리를 뽑는다.
//
// PlaceCategory 는 타입만 가져온다 — 런타임에 @prisma/client 를 끌고 들어오지 않기 위해서다
// (map-utils.ts 가 같은 이유로 Prisma 의존성을 두지 않는다).
import type { PlaceCategory } from "@prisma/client";

export type PlaceTypeInfo = {
  name: string;
  nameKo: string;
  category: PlaceCategory;
  /** 그 카테고리의 기본값 타입인가. "식당"은 "한식"을 모르는 상태를 뜻한다 */
  isDefault: boolean;
};

/** PlacePlaceType 한 줄. prisma select 가 내는 모양 그대로다 — sortOrder 0 이 대표 */
export type PlaceTypeLink = {
  sortOrder: number;
  placeType: PlaceTypeInfo;
};

/**
 * 어느 헬퍼든 null·undefined 를 그대로 받는다.
 *
 * getAllMapPlaces 는 60초 캐시(map-queries.ts:319)를 거치는데 키가 인자에 걸려 있지 않아,
 * 배포 직후 잠깐은 이 칸이 없는 옛 payload 가 그대로 나온다. 그때 화면이 죽지 않아야 한다.
 */
type Links = readonly PlaceTypeLink[] | null | undefined;

/**
 * 대표 타입. 정상 데이터에서는 sortOrder 0 이다.
 *
 * select 가 sortOrder asc 로 주지만 배열 첫 칸을 그냥 믿지 않는다 — 정렬 없이 부르는
 * 호출부가 생겨도 대표가 흔들리면 안 된다.
 */
export function primaryPlaceType(links: Links): PlaceTypeInfo | null {
  if (!links || links.length === 0) return null;
  let best = links[0];
  for (const link of links) {
    if (link.sortOrder < best.sortOrder) best = link;
  }
  return best.placeType;
}

/**
 * 이 장소가 걸리는 카테고리 목록. 중복 없이, 타입 순서를 유지한다.
 * 한 장소가 여러 카테고리를 가질 수 있어서 배열이다 — 지도 칩은 중복 매칭한다.
 */
export function placeCategories(links: Links): PlaceCategory[] {
  if (!links || links.length === 0) return [];
  const seen = new Set<PlaceCategory>();
  const out: PlaceCategory[] = [];
  for (const link of links) {
    const category = link.placeType.category;
    if (seen.has(category)) continue;
    seen.add(category);
    out.push(category);
  }
  return out;
}
