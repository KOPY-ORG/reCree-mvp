// ─── 지역 → 법정동 코드 ───────────────────────────────────────────────────────
// discover 의 지역 slug(region-utils 의 getPlaceRegionSlug — Area.nameEn 소문자)를
// TourAPI 의 lDongRegnCd / lDongSignguCds 로 옮긴다.
//
// 표를 박아 두지 않고 Area 에서 읽는다. #226 이 낸 두 컬럼이 전부 NULL 이라
// 한동안 하드코딩 표(seoul·busan·gyeongju·gangneung 넷)를 두었는데, 전국 Area 249행에
// 코드가 채워지면서 그 자리가 없어졌다. 이제 Area 를 늘리면 지역이 늘어난다.
//
// 시도(region)와 시군구(district)를 따로 받는다. 시군구 이름 하나로는 못 찾기 때문이다 —
// level 1 nameEn 이 전국에서 유일하지 않다 (Jung-gu 가 다섯 곳, Dong-gu 가 다섯 곳).
// 시도를 먼저 찾고 그 자식 안에서 고르면 한 행으로 좁혀진다.
//
// 이 모듈은 여전히 떼어내기 쉽다 — 파일을 지우고 부르는 줄을 지우면 관광 데이터가 빠진다.

import { prisma } from "@/lib/prisma";

export type PlaceRegion = {
  /** 섹션 제목에 들어가는 이름 — "Attractions in {label}" */
  label: string;
  lDongRegnCd: string;
  /**
   * 시도 전체가 대상이면 빈 배열이다. 시군구를 고르면 그 시군구의 코드들이다.
   *
   * 배열인 이유는 일반시 13곳(수원·창원·전주 등) 때문이다. 축제도 관광지도 시 코드가
   * 아니라 구 코드에 붙어 있어 코드 하나로는 조회가 안 된다 — 수원시(110) 0건,
   * 구 4개(111·113·115·117) 16건.
   */
  lDongSignguCds: string[];
};

/** Area 행 하나를 화면이 쓰는 형태로. nameEn·코드가 비어 있으면 null */
function toPlaceRegion(
  area: { nameEn: string | null; lDongRegnCd: string | null; lDongSignguCds: string[] } | null
): PlaceRegion | null {
  if (!area?.nameEn || !area.lDongRegnCd) return null;
  return {
    label: area.nameEn,
    lDongRegnCd: area.lDongRegnCd,
    lDongSignguCds: area.lDongSignguCds,
  };
}

/**
 * 시도 nameEn 이 region 과 같은 level 0 행. district 를 주면 그 시도의 자식 중
 * nameEn 이 같은 level 1 행. 없으면 null 이다.
 *
 * 코드가 비어 있는 Area 는 null 로 떨어진다. 지금 dev 는 시도 16 · 시군구 229 가
 * 전부 채워져 있지만, 어드민에서 지역을 늘리면 다시 생길 수 있는 상태다.
 *
 * district 가 그 시도에 없으면 시도 전체로 물러난다 — 화면이 그렇게 움직이기 때문이다.
 * URL 의 모르는 district 는 useDiscoverFilters 가 버리고 시도 전체를 그리는데,
 * 여기만 null 을 내면 목록은 서울 전체인데 관광 섹션만 사라진다.
 */
export async function placeRegionOf(
  region: string | null | undefined,
  district?: string | null
): Promise<PlaceRegion | null> {
  const regionName = region?.trim();
  if (!regionName) return null;

  const sido = await prisma.area.findFirst({
    where: {
      isActive: true,
      level: 0,
      nameEn: { equals: regionName, mode: "insensitive" },
      lDongRegnCd: { not: null },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameEn: true, lDongRegnCd: true, lDongSignguCds: true },
  });

  const resolvedSido = toPlaceRegion(sido);
  if (!sido || !resolvedSido) return null;

  const districtName = district?.trim();
  if (!districtName) return resolvedSido;

  // 시도 안에서는 nameEn 이 유일하다 (dev 실측 중복 0건)
  const sigungu = await prisma.area.findFirst({
    where: {
      isActive: true,
      level: 1,
      parentId: sido.id,
      nameEn: { equals: districtName, mode: "insensitive" },
      lDongRegnCd: { not: null },
    },
    orderBy: { sortOrder: "asc" },
    select: { nameEn: true, lDongRegnCd: true, lDongSignguCds: true },
  });

  return toPlaceRegion(sigungu) ?? resolvedSido;
}
