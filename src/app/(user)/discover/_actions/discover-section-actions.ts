"use server";

// ─── discover 시트 섹션 조회 ──────────────────────────────────────────────────
// 변경이 아니라 조회다. 부르는 쪽(ExploreMapView 트리)이 전부 클라이언트 컴포넌트라
// 서버 쿼리를 직접 부를 수 없어 액션으로 감싼다 — tour-actions.ts 와 같은 형태다.
//
// 홈의 같은 줄(PopularReCreeshotSection · JourneySection)은 서버 컴포넌트라 그대로
// 쓸 수 없다. 대신 **쿼리를 같은 것으로 맞춘다** — 아래 두 함수가 홈과 같은 정렬·같은
// 노출 조건을 쓰고, 카드도 홈이 쓰는 것(ReCreeshotImage · CourseCard)을 그대로 쓴다.
// 화면에 서는 물건이 홈과 다르지 않아야 한다.

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PUBLIC_RECREESHOT_WHERE } from "@/lib/visibility";
import {
  courseListSelect,
  getPublicCourses,
  toCourseListItem,
  type CourseListItem,
} from "@/lib/course-queries";

/** 홈 PopularReCreeshotSection 과 같은 수 */
const RECREESHOT_TAKE = 10;
/** 홈 JourneySection 과 같은 수 */
const JOURNEY_TAKE = 10;

export type DiscoverShot = { id: string; imageUrl: string };

const regionInput = z.object({
  /** Area.nameEn 을 소문자로 내린 slug. 없으면 전국 */
  regionKey: z.string().min(1).max(40).nullish(),
  district: z.string().min(1).max(40).nullish(),
  /** 지금 걸린 토픽 필터. 비어 있으면 토픽으로 좁히지 않는다 */
  topicIds: z.array(z.string().uuid()).max(30).optional(),
});

export type RegionSectionInput = {
  regionKey?: string | null;
  district?: string | null;
  topicIds?: string[];
};

/**
 * 지역 slug 를 Place.area 조건으로 옮긴다. 리크리샷과 여정이 같은 것을 쓴다 —
 * 두 줄이 "이 지역" 을 다르게 해석하면 한쪽만 뜨는 화면이 생긴다.
 *
 * 시군구를 주면 그 구의 Area(level 1)로, 시도만 주면 그 시도(level 0)와 그 아래
 * 구 전부로 좁힌다. Area 매칭은 nameEn 소문자 비교다 — region slug 가 그렇게 만들어진
 * 값이다 (lib/region-utils 의 getPlaceRegionSlug).
 *
 * 지역이 없으면 null 이고, 부르는 쪽은 조건을 아예 걸지 않는다(= 전국).
 */
function areaWhere(regionKey: string | null | undefined, district: string | null | undefined) {
  if (!regionKey) return null;
  if (district) {
    return { level: 1, nameEn: { equals: district, mode: "insensitive" as const } };
  }
  return {
    OR: [
      { level: 0, nameEn: { equals: regionKey, mode: "insensitive" as const } },
      { level: 1, parent: { nameEn: { equals: regionKey, mode: "insensitive" as const } } },
    ],
  };
}

/**
 * 지금 걸린 조건의 리크리샷 (화면 제목 "recreeshots in {지역}" — 표기는 항상 소문자).
 *
 * 정렬은 홈과 같다 — likeCount desc, 동점은 id desc 로 매 요청 순서가 흔들리지 않게
 * (PopularReCreeshotSection.tsx 의 판단을 그대로 가져온다).
 *
 * 지역은 장소를 거쳐 좁힌다. ReCreeshot 에 지역 칼럼이 없고 placeId 만 있어서다
 * (schema.prisma:414). 장소가 안 붙은 리크리샷은 지역을 걸면 빠진다 — 어느 지역인지
 * 알 길이 없는 것을 특정 지역 줄에 세울 수는 없다.
 *
 * 시군구를 주면 그 구의 Area 로, 시도만 주면 그 시도와 그 아래 구 전부로 좁힌다.
 * Area 매칭은 nameEn 소문자 비교다 — region slug 가 그렇게 만들어진 값이다
 * (lib/region-utils 의 getPlaceRegionSlug).
 */
export async function fetchRegionReCreeshots(
  input: RegionSectionInput
): Promise<DiscoverShot[] | null> {
  const parsed = regionInput.safeParse(input);
  if (!parsed.success) return null;
  const { regionKey, district, topicIds } = parsed.data;

  // 지역이 없으면 전국이다 — 장소 조건을 아예 걸지 않는다
  const area = areaWhere(regionKey, district);
  const placeWhere = area ? { place: { area } } : {};

  const shots = await prisma.reCreeshot.findMany({
    where: {
      ...PUBLIC_RECREESHOT_WHERE,
      ...placeWhere,
      ...(topicIds && topicIds.length > 0
        ? { reCreeshotTopics: { some: { topicId: { in: topicIds } } } }
        : {}),
    },
    orderBy: [{ likeCount: "desc" }, { id: "desc" }],
    take: RECREESHOT_TAKE,
    select: { id: true, imageUrl: true },
  });

  return shots;
}

/**
 * 공개 여정 (화면 제목 "Journeys" · 지역이 걸리면 "Journeys in {지역}").
 *
 * **지역이 걸리면 그 지역의 장소가 하나라도 담긴 여정만** 낸다. 0건이면 빈 배열이고
 * 부르는 쪽이 줄을 통째로 숨긴다 — 리크리샷과 같은 규칙이다. 지역과 무관한 여정이
 * 지역 제목 아래 서면 제목이 약속하는 것과 내용이 어긋난다.
 *
 * 전국 목록은 **지역을 고르지 않은 기본 화면에서만** 나온다.
 *
 * Course 에 지역 칼럼이 없어(schema.prisma:835) CourseDay → CourseItem → Place → Area
 * 로 역산한다. 중첩이 깊지만 공개 코스 수가 적어(수십 건) 비용이 문제 되는 자리가 아니다.
 * placeId 가 없는 관광 데이터 아이템은 지역을 알 수 없어 세지 않는다 — 앱 장소가 하나도
 * 없고 관광지만 담긴 여정은 어느 지역 줄에도 서지 않는다.
 *
 * 토픽은 CourseTopic 이 있어 한 단계면 끝난다.
 */
export async function fetchDiscoverJourneys(
  input: RegionSectionInput
): Promise<CourseListItem[] | null> {
  const parsed = regionInput.safeParse(input);
  if (!parsed.success) return null;
  const { regionKey, district, topicIds } = parsed.data;

  const area = areaWhere(regionKey, district);
  if (!area) {
    // 기본 화면 — 전국. getPublicCourses 는 토픽을 하나만 받는다. 칩이 여럿 걸린
    // 경우는 첫 번째로 좁힌다 (지금은 토픽이 걸리면 섹션 자체가 접히므로 닿지 않는 길이다)
    return getPublicCourses({ take: JOURNEY_TAKE, topicId: topicIds?.[0] });
  }

  const rows = await prisma.course.findMany({
    where: {
      isPublic: true,
      ...(topicIds && topicIds.length > 0
        ? { topics: { some: { topicId: { in: topicIds } } } }
        : {}),
      days: { some: { items: { some: { place: { area } } } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: JOURNEY_TAKE,
    select: courseListSelect,
  });
  return rows.map(toCourseListItem);
}
