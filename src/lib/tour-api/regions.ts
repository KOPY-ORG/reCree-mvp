// ─── 지역 → 법정동 코드 ───────────────────────────────────────────────────────
// discover 의 지역 slug(region-utils 의 getPlaceRegionSlug — Area.nameEn 소문자)를
// TourAPI 의 lDongRegnCd / lDongSignguCd 로 옮긴다.
//
// Area 에서 읽지 않고 여기 박아 둔다. #221 이 Area 에 두 컬럼을 냈지만 dev 27건이
// 전부 NULL 이고, 경주는 Area 행 자체가 없다. 어드민에서 Area 를 관리하게 되면(F-1)
// 이 표를 지우고 Area.lDongRegnCd 를 읽으면 된다 — 그때까지의 자리다.
//
// 코드는 추측이 아니라 실측이다. prisma/scripts/tour-api-spike-2-result.json 의
// ldongResolution 이 ldongCode2 응답의 지역명과 대조해 뽑은 값이고, 넷 다 exact 매칭이다.
//
// label 을 Area 에서 가져오지 않는 이유 — 이 모듈은 Prisma 를 모른다. 섹션 제목이
// Area 데이터 상태에 흔들리지 않고, 관광 데이터를 뗄 때 이 파일만 지우면 된다.
// (Area 의 nameEn 은 "jeju" 처럼 소문자로 들어간 행이 섞여 있어 제목에 쓰기에도 불안하다)

export type PlaceRegion = {
  /** 섹션 제목에 들어가는 이름 — "Attractions in {label}" */
  label: string;
  lDongRegnCd: string;
  /** 시도 전체가 대상이면 없다. 서울·부산이 그렇고, 경주·강릉은 도 아래 시라 필요하다 */
  lDongSignguCd?: string;
};

export const PLACE_REGIONS: Record<string, PlaceRegion> = {
  seoul: { label: "Seoul", lDongRegnCd: "11" },
  busan: { label: "Busan", lDongRegnCd: "26" },
  gyeongju: { label: "Gyeongju", lDongRegnCd: "47", lDongSignguCd: "130" },
  gangneung: { label: "Gangneung", lDongRegnCd: "51", lDongSignguCd: "150" },
};

/** 표에 없는 지역이면 null. 호출부는 null 이면 관광 섹션을 그리지 않는다 */
export function placeRegionOf(slug: string | null | undefined): PlaceRegion | null {
  if (!slug) return null;
  return PLACE_REGIONS[slug] ?? null;
}
