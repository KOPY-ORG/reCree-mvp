// ─── 분류 코드 → 라벨 ─────────────────────────────────────────────────────────
// TourAPI 목록 응답의 분류 코드를 화면에 쓸 한 단어로 옮긴다.
//
// 화면이 아니라 여기 두는 이유 — 코드 체계를 아는 것은 관광 모듈의 일이고,
// 카드가 둘 이상(맵 지역 섹션 · 나중에 코스 편집기)이면 표가 갈릴 자리가 생긴다.
// detail-fields.ts 와 같은 성격의 파일이다. 관광 데이터를 뗄 때 함께 빠진다.
//
// 컴포넌트를 합치지는 않는다. 맵 지역 섹션과 포스트 Nearby 는 부르는 API 가 달라
// (areaBasedList2 는 dist 가 없고 locationBasedList2 는 있다) 부제가 다른 것이 맞다.
// 공용으로 두는 것은 이 표 하나뿐이다.

/**
 * cat2 — 관광공사 중분류.
 *
 * 4개 지역 160건 실측에서 61건(38%)만 차 있고 11종이 나왔다. 여기 적은 것이 그 11종이다.
 * 표에 없는 코드는 억지로 이름을 붙이지 않고 아래 contentTypeId 로 넘긴다 —
 * detail-fields 와 같은 규칙이다. 실측한 것만 적는다.
 *
 * A0202 는 표준 이름이 "휴양관광지" 인데 실측 6건이 전부 병원·의원이었다(의료관광).
 * 둘 다 아우르는 말로 Wellness 를 쓴다.
 */
const CAT2_LABELS: Record<string, string> = {
  A0101: "Nature",
  A0201: "Historic site",
  A0202: "Wellness",
  A0203: "Experience",
  A0206: "Culture",
  A0207: "Festival",
  A0302: "Sports",
  A0305: "Sports",
  A0401: "Shopping",
  A0502: "Restaurant",
  B0201: "Stay",
};

/**
 * contentTypeId — 대분류. cat2 가 빈 자리를 메운다.
 *
 * 실측 160/160 이 차 있어 이걸 마지막으로 두면 부제가 비는 카드가 없다.
 * 코드 체계가 서비스마다 갈리는 것은 detail-fields.ts 와 같다 —
 * 같은 범주를 가리키는 두 코드에 같은 라벨을 건다.
 *   KorService2  12 관광지 · 14 문화시설 · 15 축제 · 28 레포츠 · 32 숙박 · 38 쇼핑 · 39 음식점
 *   EngService2  76 관광지 · 78 문화시설 · 85 축제 · 75 레포츠 · 80 숙박 · 79 쇼핑 · 82 음식점
 */
const CONTENT_TYPE_LABELS: Record<string, string> = {
  "12": "Attraction",
  "76": "Attraction",
  "14": "Culture",
  "78": "Culture",
  "15": "Festival",
  "85": "Festival",
  "28": "Sports",
  "75": "Sports",
  "32": "Stay",
  "80": "Stay",
  "38": "Shopping",
  "79": "Shopping",
  "39": "Restaurant",
  "82": "Restaurant",
};

/**
 * 카드 부제에 쓸 분류 한 단어. 좁은 것부터 넓은 것으로 물러선다.
 *
 *   cat2 → contentTypeId → null
 *
 * 둘 다 없으면 null 이고 부르는 쪽이 그 줄을 그리지 않는다.
 * 실측에서는 contentTypeId 가 160/160 이라 null 이 나오지 않았다.
 */
export function attractionCategoryLabel(item: {
  cat2: string | null;
  contentTypeId: string | null;
}): string | null {
  const byCat2 = item.cat2 ? CAT2_LABELS[item.cat2] : undefined;
  if (byCat2) return byCat2;

  const byType = item.contentTypeId ? CONTENT_TYPE_LABELS[item.contentTypeId] : undefined;
  return byType ?? null;
}
