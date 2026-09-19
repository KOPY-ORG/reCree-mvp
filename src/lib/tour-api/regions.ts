// ─── 지역 → 법정동 코드 ───────────────────────────────────────────────────────
// discover 의 지역 slug(region-utils 의 getPlaceRegionSlug — Area.nameEn 소문자)를
// TourAPI 의 lDongRegnCd / lDongSignguCds 로 옮긴다.
//
// 표를 박아 두지 않고 Area 에서 읽는다. #226 이 낸 두 컬럼이 전부 NULL 이라
// 한동안 하드코딩 표(seoul·busan·gyeongju·gangneung 넷)를 두었는데, 전국 Area 249행에
// 코드가 채워지면서 그 자리가 없어졌다. 이제 Area 를 늘리면 지역이 늘어난다.
//
// getPlaceRegionSlug 가 level 1 을 parent 로 rollup 하므로 여기 들어오는 slug 는
// 언제나 level 0(시도)의 nameEn 이다. 시군구 단위 섹션을 원하면 rollup 쪽을 고쳐야 한다.
//
// 이 모듈은 여전히 떼어내기 쉽다 — 파일을 지우고 부르는 줄을 지우면 관광 데이터가 빠진다.

import { prisma } from "@/lib/prisma";

export type PlaceRegion = {
  /** 섹션 제목에 들어가는 이름 — "Attractions in {label}" */
  label: string;
  lDongRegnCd: string;
  /**
   * 시도 전체가 대상이면 빈 배열이다.
   *
   * 배열인 이유는 일반시 13곳(수원·창원·전주 등) 때문이다. 축제도 관광지도 시 코드가
   * 아니라 구 코드에 붙어 있어 코드 하나로는 조회가 안 된다 — 수원시(110) 0건,
   * 구 4개(111·113·115·117) 16건.
   */
  lDongSignguCds: string[];
};

/**
 * Area.nameEn 이 slug 와 같고 lDongRegnCd 가 채워진 행. 없으면 null 이다.
 *
 * 코드가 비어 있는 Area(광주 · 충청)는 null 로 떨어진다. 광주는 API 가 전남과
 * 통합(12)해 시도에 없고, 충청은 충북·충남 둘 다라 하나로 못 정한다. 어드민에서
 * 사람이 정하면 그때부터 섹션이 뜬다 — 코드를 고칠 필요가 없다.
 *
 * nameEn 은 유일하지 않다(광역시의 "Jung-gu" 가 다섯 곳). rollup 때문에 실제로
 * 들어오는 것은 시도뿐이지만, 결과가 흔들리지 않게 level·sortOrder 로 순서를 고정한다.
 */
export async function placeRegionOf(slug: string | null | undefined): Promise<PlaceRegion | null> {
  if (!slug?.trim()) return null;

  const area = await prisma.area.findFirst({
    where: {
      isActive: true,
      nameEn: { equals: slug.trim(), mode: "insensitive" },
      lDongRegnCd: { not: null },
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    select: { nameEn: true, lDongRegnCd: true, lDongSignguCds: true },
  });

  if (!area?.nameEn || !area.lDongRegnCd) return null;

  return {
    label: area.nameEn,
    lDongRegnCd: area.lDongRegnCd,
    lDongSignguCds: area.lDongSignguCds,
  };
}
