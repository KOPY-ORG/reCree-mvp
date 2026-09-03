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

export type Attraction = {
  contentId: string;
  title: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  /** locationBasedList2의 dist. 없으면 null */
  distanceM: number | null;
  contentTypeId: string | null;
};

export type Festival = {
  contentId: string;
  title: string;
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
