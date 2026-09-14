// ─── 상세 필드 프리셋 ─────────────────────────────────────────────────────────
// detailIntro2 는 contentTypeId 마다 필드명이 다르다. 어느 칸을 어떤 이름으로
// 보여줄지를 여기 한 곳에 모은다 — 조회 로직이 표에 파묻히지 않게.
//
// 코드 체계가 서비스마다 다르다. 실측한 것만 적는다.
//   KorService2  12 관광지 · 14 문화시설 · 32 숙박 · 38 쇼핑 · 39 음식점
//   EngService2  76 관광지 · 78 문화시설 · 80 숙박 · 79 쇼핑 · 82 음식점
// 같은 범주를 코드 둘이 가리키므로 프리셋 하나를 두 코드에 건다.
//
// 여기 없는 타입(축제 15/85 · 레포츠 28/75 등)은 블록을 통째로 숨긴다.
// 실측 표본에서 10% 남짓이고, 축제는 eventstartdate 처럼 성격이 다른 필드라
// 같은 표에 억지로 끼우면 라벨이 맞지 않는다.

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
