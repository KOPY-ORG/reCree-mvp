// 시도별 장소 집계 — 한반도 카드용. 서버 전용
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { SidoKey } from "@/lib/korea-projection";

/**
 * Area.nameEn(시도) → 경계 데이터의 시도 키.
 *
 * 경계는 17개인데 Area 는 16개다. seed-areas.ts 가 한국관광공사 lDongRegnCd 를 따라
 * 광주와 전남을 코드 12 하나로 합쳐 "Jeonnam-Gwangju" 로 두었기 때문이다.
 * 합쳐진 Area 는 더 넓은 South Jeolla 쪽 핀에 얹는다 — 쪼개서 나눌 근거가 DB 에 없다.
 * 그 결과 Gwangju 핀에는 영영 장소가 붙지 않는다(항상 0 → 핫스팟 안 그림).
 *
 * 왼쪽 키는 Area.nameEn 이고 seed-areas.ts 의 SIDO_NAME_EN 고정표에서 온다.
 * 저 표가 바뀌면 여기도 바뀌어야 한다 — 매칭 실패는 조용히 0 이 되지 않고
 * getSidoPlaceCounts 가 unmapped 로 돌려준다.
 */
const AREA_NAME_TO_SIDO: Record<string, SidoKey> = {
  Seoul: "Seoul",
  Busan: "Busan",
  Daegu: "Daegu",
  Incheon: "Incheon",
  Daejeon: "Daejeon",
  Ulsan: "Ulsan",
  Sejong: "Sejong",
  "Gyeonggi-do": "Gyeonggi",
  "Gangwon-do": "Gangwon",
  "Chungcheongbuk-do": "North Chungcheong",
  "Chungcheongnam-do": "South Chungcheong",
  "Jeonbuk-do": "North Jeolla",
  "Jeonnam-Gwangju": "South Jeolla",
  "Gyeongsangbuk-do": "North Gyeongsang",
  "Gyeongsangnam-do": "South Gyeongsang",
  "Jeju-do": "Jeju",
};

export type SidoPlaceCount = { sido: SidoKey; areaNameEn: string; count: number };

export type SidoPlaceCounts = {
  counts: SidoPlaceCount[];
  /** 가장 많은 시도의 장소 수. hotspotRadius 의 기준 */
  maxCount: number;
  /** areaId 가 붙은 장소 총합. 해외 등 areaId NULL 은 빠진다 */
  total: number;
  /** AREA_NAME_TO_SIDO 에 없는 Area.nameEn — 표를 고쳐야 한다는 신호 */
  unmapped: { areaNameEn: string; count: number }[];
};

type Row = { areaNameEn: string; n: bigint };

async function computeSidoPlaceCounts(topicId: string | null): Promise<SidoPlaceCounts> {
  // Place.areaId 는 보통 시군구(level 1)를 가리킨다. 시도까지 올리려면 parentId 를 한 번
  // 타야 한다. 세종만 시군구가 없어 level 0 에 직접 붙으므로 COALESCE 로 둘 다 받는다.
  // Prisma groupBy 는 관계를 타고 묶지 못해 raw SQL 을 쓴다.
  //
  // 토픽은 Place 에 직접 붙지 않는다 — Place → PostPlace → Post → PostTopic 을 타야 한다.
  // 그 경로를 JOIN 으로 펴면 포스트가 여러 개 걸린 장소가 그 수만큼 세어지므로,
  // 개수가 아니라 존재만 묻는 EXISTS 로 둔다.
  //
  // 토픽이 없을 때도 같은 쿼리를 쓴다. NULL 이면 OR 왼쪽에서 판정이 끝나 EXISTS 를
  // 평가하지 않는다 — 전체 집계는 이 조인을 붙이기 전과 같은 결과를 낸다.
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT COALESCE(sido."nameEn", a."nameEn") AS "areaNameEn", COUNT(*) AS n
    FROM "Place" pl
    JOIN "Area" a ON a.id = pl."areaId"
    LEFT JOIN "Area" sido ON sido.id = a."parentId"
    WHERE pl."areaId" IS NOT NULL
      AND (
        ${topicId}::uuid IS NULL
        OR EXISTS (
          SELECT 1
          FROM "PostPlace" pp
          JOIN "Post" p ON p.id = pp."postId"
          JOIN "PostTopic" pt ON pt."postId" = p.id
          WHERE pp."placeId" = pl.id
            AND p."status" = 'PUBLISHED'
            AND p."isShop" = false
            AND pt."topicId" = ${topicId}::uuid
        )
      )
    GROUP BY 1
  `;

  const counts: SidoPlaceCount[] = [];
  const unmapped: { areaNameEn: string; count: number }[] = [];
  let total = 0;

  for (const row of rows) {
    const count = Number(row.n);
    total += count;
    const sido = AREA_NAME_TO_SIDO[row.areaNameEn];
    if (!sido) { unmapped.push({ areaNameEn: row.areaNameEn, count }); continue; }
    counts.push({ sido, areaNameEn: row.areaNameEn, count });
  }

  counts.sort((a, b) => b.count - a.count);
  const maxCount = counts.length > 0 ? counts[0].count : 0;

  return { counts, maxCount, total, unmapped };
}

const cachedSidoPlaceCounts = unstable_cache(
  computeSidoPlaceCounts,
  ["sido-place-counts"],
  { revalidate: 300, tags: ["sido-place-counts"] },
);

/**
 * 시도별 장소 수. 사용자와 무관한 값만 담는다 —
 * 개인화 값을 넣으면 첫 방문자의 상태가 5분간 모두에게 나간다.
 *
 * topicId 를 주면 그 토픽의 포스트에 붙은 장소만 센다. 없으면 전체다.
 *
 * topicId 는 캐시 함수의 **인자로** 넘어간다 — unstable_cache 가 인자를 키에 넣기
 * 때문이다 (tour-api/translate.ts:134 와 같은 계약). 키를 나누지 않으면 먼저 조회한
 * 토픽의 숫자가 5분간 다른 모든 탭에 그대로 나간다. 지도는 멀쩡히 그려지고
 * 숫자만 틀리므로 눈으로 잡기 어렵다.
 */
export function getSidoPlaceCounts(topicId: string | null = null): Promise<SidoPlaceCounts> {
  return cachedSidoPlaceCounts(topicId);
}

export { computeSidoPlaceCounts };
