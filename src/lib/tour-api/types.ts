// ─── TourAPI 타입 ─────────────────────────────────────────────────────────────
// 한국관광공사 OpenAPI 응답 DTO. 요청 수명 안에서만 산다 — Prisma 스키마에 넣지 않는다.

export type TourLang = "ko" | "en";

/** API 원본 아이템. 문서와 실제 응답이 어긋나는 경우가 있어 전부 optional + 인덱스 시그니처 */
export type TourItem = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  dist?: string;
  firstimage?: string;
  firstimage2?: string;
  code?: string;
  name?: string;
  areacode?: string;
  sigungucode?: string;
  eventstartdate?: string;
  eventenddate?: string;
  [key: string]: unknown;
};

export type TourResult<T> = { items: T[]; totalCount: number | null };

/**
 * title 과 titleKo 의 의미는 어느 언어로 받아 왔든 같다.
 *   title    화면에 띄우는 영문. 영문 응답이면 괄호 앞을 떼어낸 것, 국문 응답이면 번역 결과다
 *   titleKo  국문. 영문 응답이면 괄호 안을 떼어낸 것, 국문 응답이면 원문 그대로다
 * 번역이 실패하면 title 에 국문이 그대로 남는다 — 비어 있는 것보다 낫다.
 */
export type Attraction = {
  contentId: string;
  title: string;
  /** 형태가 "영문 (한글)" 이 아니면 null */
  titleKo: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  /** locationBasedList2의 dist. 없으면 null */
  distanceM: number | null;
  contentTypeId: string | null;
};

/** title / titleKo 의 의미는 Attraction 과 같다. 축제는 국문 단일 소스라 titleKo 가 항상 원문이다 */
export type Festival = {
  contentId: string;
  title: string;
  titleKo: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  /** "20260915" */
  startDate: string;
  endDate: string;
  status: "ongoing" | "upcoming";
  /** ongoing이면 0 이하 */
  daysUntilStart: number;
  daysUntilEnd: number;
};

export type LdongCode = { code: string; name: string };
