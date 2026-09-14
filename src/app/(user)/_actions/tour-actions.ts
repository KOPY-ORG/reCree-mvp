"use server";

// ─── 관광 데이터 액션 ─────────────────────────────────────────────────────────
// 변경이 아니라 조회다. 부르는 쪽이 클라이언트 컴포넌트라 서버 쿼리를 직접
// 부를 수 없어 액션으로 감싼다 (recreeshot-actions 의 searchPlaces 와 같은 형태).
//
// course-actions 에서 떼어 온 파일이다. 관광 데이터는 모듈처럼 뗄 수 있어야 하는데,
// 코스 액션 안에 있으면 떼어낼 때 코스 코드를 열어 잘라내야 했다. 쓰는 화면이
// 편집기와 포스트 상세 둘로 늘면서 그 결합도 둘이 된다.
// 지금은 이 파일과 부르는 줄만 지우면 관광 데이터가 통째로 빠진다.

import { z } from "zod";
import { getNearbyAttractions } from "@/lib/tour-api/queries";
import type { Attraction } from "@/lib/tour-api/types";

/** Nearby Attractions 반경 */
const NEARBY_RADIUS_M = 5000;

/**
 * 좌표 주변 관광지 (출처: ⓒ한국관광공사).
 *
 * 실패하면 null이다 — 부른 쪽의 그 자리만 비고 나머지 화면은 그대로 산다.
 * TourAPI 응답은 DB에 저장하지 않는다. 요청 수명 안에서만 사는 DTO다.
 *
 * 반경과 개수(queries 의 DEFAULT_LIMIT)는 편집기와 포스트 상세가 같은 값을 쓴다.
 * 값이 갈리면 돌아오는 항목 집합이 달라져 translate.ts 의 캐시 키까지 갈린다 —
 * 같은 동네를 두 화면에서 볼 때 한쪽이 채운 번역을 다른 쪽이 못 쓰게 된다.
 * 개수를 10 아래로 내려서도 안 된다. queries 의 KO_BACKFILL_THRESHOLD 가 10 이라
 * 영문이 아무리 잘 나와도 임계를 넘지 못해 매번 번역을 부르게 된다.
 */
export async function fetchNearbyAttractions(input: {
  lat: number;
  lng: number;
}): Promise<Attraction[] | null> {
  const parsed = z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .safeParse(input);
  if (!parsed.success) return null;

  // 언어를 고르지 않는다 — 영문을 먼저 부르고 모자라면 국문을 번역해 덧대는 것은 queries 안쪽 일이다
  const result = await getNearbyAttractions({
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    radiusM: NEARBY_RADIUS_M,
  });
  if (!result) return null;

  // 좌표 없는 항목은 코스에 넣어도 지도에 못 찍는다 — 목록에서 뺀다
  return result.items
    .filter((item) => item.lat !== null && item.lng !== null)
    .map((item) => ({
      ...item,
      // TourAPI는 이미지를 http로 돌려주는 경우가 있다. https 페이지에서 mixed content로
      // 차단되고, 그대로 CourseItem에 저장되면 코스 상세에서도 계속 깨진다.
      imageUrl: item.imageUrl?.replace(/^http:\/\//, "https://") ?? null,
    }));
}
