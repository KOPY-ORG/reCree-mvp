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
 *
 * 주소는 제목과 달리 병기하지 않는다. 언어별로 아예 다른 칸에 담는다.
 *   address    영문 주소. 영문 응답에만 있다. 국문 응답으로 온 항목은 null 이다
 *   addressKo  국문 주소. 국문 응답에만 있다
 * 번역하지 않기 때문에 둘 중 하나만 찬다. 화면은 address 만 그리므로
 * 국문 경로 항목에는 주소 줄이 아예 생기지 않는다 — 한 목록 안에서 주소 언어가 섞이지 않는다.
 * 저장할 때는 Place 갈래와 같은 규칙으로 `address ?? addressKo` 폴백을 쓴다.
 */
export type Attraction = {
  contentId: string;
  /**
   * 이 항목이 어느 서비스에서 왔는지.
   *
   * 상세 조회(detailCommon2 등)가 이 값을 필요로 한다. EN/KO 는 contentId 공간이
   * 분리돼 있어 상대 서비스에 물으면 0건이다 — 세 엔드포인트 전부 실측 0/3 이다.
   * 추론하지 않고 만들 때 박아 둔다.
   */
  lang: TourLang;
  title: string;
  /** 형태가 "영문 (한글)" 이 아니면 null */
  titleKo: string | null;
  address: string | null;
  addressKo: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  /** locationBasedList2의 dist. 없으면 null */
  distanceM: number | null;
  contentTypeId: string | null;
};

/**
 * title / titleKo / address / addressKo 의 의미는 Attraction 과 같다.
 * 축제는 국문 단일 소스라 titleKo 가 항상 원문이고 address 는 항상 null 이다.
 */
export type Festival = {
  contentId: string;
  title: string;
  titleKo: string | null;
  address: string | null;
  addressKo: string | null;
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

// ─── 상세 ─────────────────────────────────────────────────────────────────────
// 세 엔드포인트를 세 액션으로 나눠 부른다. 화면이 도착하는 대로 채우기 위해서다.
// 어느 것도 캐싱하지 않는다 — TourAPI 응답은 실시간 호출이 요강이다.

/** detailCommon2. 값이 없는 칸은 null 이다 — API 는 빈 문자열로 주지만 여기서 정리한다 */
export type AttractionEssentials = {
  /** 태그를 걷어낸 본문. 국문 경로면 번역된 것이다 */
  overview: string | null;
  address: string | null;
  /** homepage 의 <a href> 에서 뽑은 것. 태그를 그대로 내보내지 않는다 */
  homepageUrls: string[];
};

/** detailIntro2. 라벨까지 붙여 내보낸다 — 타입별 필드명 분기를 화면이 알 필요가 없다 */
export type AttractionIntroRow = { label: string; value: string };
