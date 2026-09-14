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
import {
  getAreaAttractions,
  getAttractionEssentials,
  getAttractionImages,
  getAttractionIntro,
  getFestivals,
  getNearbyAttractions,
} from "@/lib/tour-api/queries";
import { placeRegionOf } from "@/lib/tour-api/regions";
import type {
  Attraction,
  AttractionEssentials,
  AttractionIntroRow,
  Festival,
} from "@/lib/tour-api/types";

/** Nearby Attractions 반경 */
const NEARBY_RADIUS_M = 5000;

/**
 * TourAPI 는 이미지를 http 로 돌려주는 경우가 있다. https 페이지에서 mixed content 로
 * 차단되고, 그대로 CourseItem 에 저장되면 코스 상세에서도 계속 깨진다.
 */
function toHttps(url: string | null | undefined): string | null {
  return url?.replace(/^http:\/\//, "https://") ?? null;
}

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
    .map((item) => ({ ...item, imageUrl: toHttps(item.imageUrl) }));
}

// ─── 지역 단위 관광 데이터 ────────────────────────────────────────────────────
// 맵 시트의 "Attractions in {도시}" · "Festivals in {도시}" 두 줄이 쓴다.
//
// 좌표가 아니라 지역 키를 받는다. 부르는 쪽은 지금 고른 지역 slug 만 알면 되고,
// 그 slug 가 어떤 법정동 코드인지는 tour-api/regions 안쪽 일이다 — 화면이 코드를 모른다.
//
// 좌표 없는 항목을 걸러내지 않는다. 이 둘은 코스에 담기는 목록이 아니라 읽는 목록이라
// 지도에 못 찍는 것도 카드로는 멀쩡하다.

/** 지역 관광지 (출처: ⓒ한국관광공사). 표에 없는 지역이거나 실패하면 null */
export async function fetchRegionAttractions(input: {
  regionKey: string;
}): Promise<Attraction[] | null> {
  const parsed = z.object({ regionKey: z.string().min(1).max(40) }).safeParse(input);
  if (!parsed.success) return null;

  const region = placeRegionOf(parsed.data.regionKey);
  if (region === null) return null;

  // limit 을 넘기지 않는다 — queries 의 DEFAULT_LIMIT(20)이 KO_BACKFILL_THRESHOLD(10)의
  // 두 배라, 영문이 얇은 지역에서도 국문 덧대기가 임계를 넘는다
  const result = await getAreaAttractions({
    regnCd: region.lDongRegnCd,
    signguCd: region.lDongSignguCd,
  });
  if (!result) return null;

  return result.items.map((item) => ({ ...item, imageUrl: toHttps(item.imageUrl) }));
}

/**
 * 화면에 올리는 축제 수.
 *
 * 기본값(20)을 쓰지 않는다. getFestivals 는 자른 뒤 남은 것만 번역하므로 이 수가 곧
 * 번역 비용이다 — 서울은 32건이 잡히는데 가로 한 줄에서 열두 장 너머까지 미는 사람은 없다.
 * 정렬이 진행중 먼저 · 임박순이라 앞 열둘이 가장 볼 만한 것들이다.
 */
const FESTIVAL_LIMIT = 12;

/**
 * 며칠 앞까지의 축제를 올릴지.
 *
 * queries 의 기본값 30 을 쓰지 않는다. 해외 팬은 방한을 두세 달 전부터 짚어 보는데
 * 30일은 "지금 갈 수 있는 것"만 남겨 지방이 사실상 비었다 — 강릉이 0건이었다.
 *
 * 60일로 늘렸을 때 실측 (2026-09-14 기준, 필터 통과 건수):
 *   서울 40→45 · 부산 9→16 · 경주 4→4 · 강릉 0→1
 * 화면에 뜨는 카드로는 부산 9→12장, 강릉 0→1장이다 (강릉은 섹션이 처음 생긴다).
 * 서울은 12칸을 진행중이 다 먹고 있어 변화가 없다 — 그건 정렬 문제다(아래 주석 참고).
 *
 * 수집 쪽은 건드릴 필요가 없다. upcomingDays 는 받아 온 뒤 거르는 값이라 API 호출이
 * 달라지지 않는다. FESTIVAL_MAX_PAGES(3) × FESTIVAL_ROWS(100) = 300 이 상한인데
 * 60일에서 필터를 통과한 최대가 서울 45건이라 여유가 크고, lookback 180일은 진행중
 * 판정에만 쓰여 예정 축제와 무관하다.
 */
const FESTIVAL_UPCOMING_DAYS = 60;

/** 지역 축제 (출처: ⓒ한국관광공사). 표에 없는 지역이거나 실패하면 null */
export async function fetchRegionFestivals(input: {
  regionKey: string;
}): Promise<Festival[] | null> {
  const parsed = z.object({ regionKey: z.string().min(1).max(40) }).safeParse(input);
  if (!parsed.success) return null;

  const region = placeRegionOf(parsed.data.regionKey);
  if (region === null) return null;

  const result = await getFestivals({
    regnCd: region.lDongRegnCd,
    signguCd: region.lDongSignguCd,
    upcomingDays: FESTIVAL_UPCOMING_DAYS,
    limit: FESTIVAL_LIMIT,
  });
  if (!result) return null;

  return result.items.map((item) => ({ ...item, imageUrl: toHttps(item.imageUrl) }));
}

// ─── 관광지 상세 ──────────────────────────────────────────────────────────────
// 셋으로 나눈 이유는 도착 시각이 다르기 때문이다. 하나로 묶으면 가장 느린 것
// (국문 경로의 번역, 최대 5초)이 나머지를 붙잡는다. 화면은 오는 대로 채운다.
//
// 어느 것도 캐싱하지 않는다. TourAPI 응답은 실시간 호출이 요강이다.
//
// lang 은 목록이 준 Attraction.lang 을 그대로 돌려 받는다. EN/KO 는 contentId 공간이
// 분리돼 상대 서비스에 물으면 0건이라(세 엔드포인트 전부 실측 0/3) 추측해서는 안 된다.

/** TourAPI contentId 는 숫자 문자열이다. 클라이언트 입력이라 형태를 막아 둔다 */
const detailInput = z.object({
  contentId: z.string().regex(/^\d{1,12}$/),
  lang: z.enum(["ko", "en"]),
});

/** 빠름 — 개요 · 주소 · 홈페이지. 국문 경로면 개요 번역이 붙는다 */
export async function fetchAttractionEssentials(input: {
  contentId: string;
  lang: "ko" | "en";
}): Promise<AttractionEssentials | null> {
  const parsed = detailInput.safeParse(input);
  if (!parsed.success) return null;
  return getAttractionEssentials(parsed.data);
}

/** 중간 — 갤러리 */
export async function fetchAttractionImages(input: {
  contentId: string;
  lang: "ko" | "en";
}): Promise<string[] | null> {
  const parsed = detailInput.safeParse(input);
  if (!parsed.success) return null;

  const urls = await getAttractionImages(parsed.data);
  if (urls === null) return null;

  // 목록 이미지와 같은 처리다. API 가 http 로 주는데 https 페이지에서 mixed content 로 막힌다
  return urls.map((u) => toHttps(u) ?? u);
}

/** 느림 — 영업시간 · 휴무 · 주차 · 전화. 국문 경로면 값 번역이 붙는다 */
export async function fetchAttractionIntro(input: {
  contentId: string;
  contentTypeId: string | null;
  lang: "ko" | "en";
}): Promise<AttractionIntroRow[] | null> {
  const parsed = detailInput
    .extend({ contentTypeId: z.string().regex(/^\d{1,4}$/).nullable() })
    .safeParse(input);
  if (!parsed.success) return null;
  return getAttractionIntro(parsed.data);
}
