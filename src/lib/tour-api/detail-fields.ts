// ─── 상세 필드 프리셋 ─────────────────────────────────────────────────────────
// detailIntro2 는 contentTypeId 마다 필드명이 다르다. 어느 칸을 어떤 이름으로
// 보여줄지를 여기 한 곳에 모은다 — 조회 로직이 표에 파묻히지 않게.
//
// 코드 체계가 서비스마다 다르다. 실측한 것만 적는다.
//   KorService2  12 관광지 · 14 문화시설 · 15 축제 · 32 숙박 · 38 쇼핑 · 39 음식점
//   EngService2  76 관광지 · 78 문화시설 · 80 숙박 · 79 쇼핑 · 82 음식점
// 같은 범주를 코드 둘이 가리키므로 프리셋 하나를 두 코드에 건다.
//
// 여기 없는 타입(레포츠 28/75 등)은 블록을 통째로 숨긴다. 실측 표본에서 10% 남짓이다.

export type DetailField = {
  /** detailIntro2 응답의 필드명 */
  key: string;
  /** 화면 라벨. UI 문구는 영어로 쓴다 */
  label: string;
};

/**
 * 전화는 detailCommon2 의 tel 이 아니라 여기 infocenter* 에 있다.
 * 실측으로 tel 은 40건 중 1건만 찼고 infocenter 는 13/13 이었다.
 * 거의 항상 비는 칸을 따로 두지 않고 이 블록의 마지막 줄로 넣는다.
 */
const ATTRACTION: DetailField[] = [
  { key: "usetime", label: "Hours" },
  { key: "restdate", label: "Closed" },
  { key: "parking", label: "Parking" },
  { key: "infocenter", label: "Phone" },
];

const CULTURE: DetailField[] = [
  { key: "usetimeculture", label: "Hours" },
  { key: "restdateculture", label: "Closed" },
  { key: "parkingculture", label: "Parking" },
  { key: "usefee", label: "Admission" },
  { key: "infocenterculture", label: "Phone" },
];

/** 음식점에는 이용요금 필드가 없다. 대표메뉴가 그 자리를 대신한다 */
const FOOD: DetailField[] = [
  { key: "opentimefood", label: "Hours" },
  { key: "restdatefood", label: "Closed" },
  { key: "parkingfood", label: "Parking" },
  { key: "firstmenu", label: "Signature menu" },
  { key: "infocenterfood", label: "Phone" },
];

/** 숙박에는 영업시간도 휴무일도 없다. 입·퇴실 시각이 그 자리다 */
const LODGING: DetailField[] = [
  { key: "checkintime", label: "Check-in" },
  { key: "checkouttime", label: "Check-out" },
  { key: "parkinglodging", label: "Parking" },
  { key: "infocenterlodging", label: "Phone" },
];

/**
 * 축제(15). 다른 프리셋과 달리 "언제 하는가"가 없다 — eventstartdate/eventenddate 는
 * 목록(searchFestival2)이 이미 준 것이고, 화면은 그것을 카드와 시트 제목 아래에
 * 사람이 읽는 형태("Now on · Sep 12 – 21")로 그린다. 같은 날짜를 표 안에 한 번 더
 * 넣으면 형식만 다른 같은 값이 두 줄 생긴다.
 *
 * 4개 지역 21건 실측 — eventplace · usetimefestival · program · sponsor1 · sponsor1tel 이
 * 21/21, playtime 이 20/21 이다. 번역 비용도 칸마다 다르다. sponsor1tel 은 21건 다
 * 한글이 없어 공짜고, playtime 도 "14:00 / 17:00" 같은 값이라 21건 중 5건만 한글이 섞인다.
 *
 * agelimit 은 3/21 로 얇지만 넣는다. 값이 "전 연령" · "13세 이상" 처럼 짧고, 있을 때는
 * 갈지 말지를 바로 정해 준다. 빈 칸은 queries 가 줄째로 지우므로 없을 때 드는 값이 없다.
 * 반대로 spendtimefestival(2/21) · sponsor2tel(0/21) · eventhomepage(0/21) 은 넣지 않았다.
 *
 * EngService2 의 축제(85)는 걸지 않는다. getFestivals 가 국문 단일 소스라
 * 이 프리셋에 85 로 들어오는 항목이 없고, 영문 필드명은 실측한 적이 없다.
 */
const FESTIVAL: DetailField[] = [
  { key: "eventplace", label: "Venue" },
  { key: "playtime", label: "Hours" },
  { key: "usetimefestival", label: "Admission" },
  // 입장 조건끼리 붙인다 — 요금 다음 줄이 나이 제한이다
  { key: "agelimit", label: "Age limit" },
  { key: "program", label: "Program" },
  { key: "sponsor1", label: "Organizer" },
  { key: "sponsor1tel", label: "Phone" },
];

const SHOPPING: DetailField[] = [
  { key: "opentime", label: "Hours" },
  { key: "restdateshopping", label: "Closed" },
  { key: "parkingshopping", label: "Parking" },
  { key: "infocentershopping", label: "Phone" },
];

const PRESETS: Record<string, DetailField[]> = {
  // 관광지
  "12": ATTRACTION,
  "76": ATTRACTION,
  // 문화시설
  "14": CULTURE,
  "78": CULTURE,
  // 축제 — 국문만
  "15": FESTIVAL,
  // 음식점
  "39": FOOD,
  "82": FOOD,
  // 숙박
  "32": LODGING,
  "80": LODGING,
  // 쇼핑
  "38": SHOPPING,
  "79": SHOPPING,
};

/** 모르는 타입이면 빈 배열. 호출부는 줄이 0개면 블록을 그리지 않는다 */
export function detailFieldsFor(contentTypeId: string | null): DetailField[] {
  if (!contentTypeId) return [];
  return PRESETS[contentTypeId] ?? [];
}
