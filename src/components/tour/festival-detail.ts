// ─── 축제를 상세 시트에 넘기는 변환 ───────────────────────────────────────────
// RegionTourSections.tsx:36-65, :314-323 에 있던 것을 그대로 옮긴 것이다.
//
// 홈도 같은 시트를 열게 되면서 discover 트리에 있을 이유가 없어졌다. 거기 두고 홈에서
// import 하면 홈이 discover 내부를 들여다보게 되고, 홈에 한 벌 더 적으면 같은 축제가
// 두 화면에서 다르게 열리기 시작한다.
//
// 서버 컴포넌트에서 부르지 않는다. 아래 두 헬퍼가 "use client" 인 FestivalCard 에서
// 오기 때문에, 서버 그래프에서는 함수가 아니라 클라이언트 참조로 바뀌어 호출이 막힌다.
// 시트 자체가 클라이언트 컴포넌트라 이것을 부르는 쪽은 언제나 클라이언트다.

import type { Attraction, Festival } from "@/lib/tour-api/types";
import type { CardAspect } from "./CardImage";
import { festivalStatusLabel, formatFestivalPeriod } from "./FestivalCard";

/**
 * 축제를 상세 시트가 아는 형태로 옮긴다.
 *
 * 시트를 하나 더 만들지 않는 이유 — 축제도 detailCommon2(개요·주소·홈페이지)와
 * detailImage2(갤러리)가 관광지와 똑같이 답한다. 실측으로 개요 365자 · 사진 9장이었다.
 * 다른 것은 detailIntro2 의 필드명뿐이고 그건 detail-fields 의 프리셋이 이미 흡수한다.
 *
 *   lang           getFestivals 는 국문 단일 소스다. 영문 서비스에 이 contentId 를
 *                  물으면 0건이다 (id 공간이 갈려 있다)
 *   contentTypeId  축제는 KorService2 에서 15 다. 프리셋이 이 값으로 걸려 있다
 *   distanceM      areaBasedList2 · searchFestival2 는 dist 를 주지 않는다.
 *                  null 이면 시트가 거리 줄을 그리지 않고 그 자리에 meta 가 들어간다
 */
function festivalAsAttraction(festival: Festival): Attraction {
  return {
    contentId: festival.contentId,
    lang: "ko",
    title: festival.title,
    titleKo: festival.titleKo,
    address: festival.address,
    addressKo: festival.addressKo,
    lat: festival.lat,
    lng: festival.lng,
    imageUrl: festival.imageUrl,
    distanceM: null,
    contentTypeId: "15",
    // 축제 목록(searchFestival2)은 cat2 를 주지 않는다. contentTypeId 15 가 Festival 로 읽힌다
    cat2: null,
  };
}

/**
 * 축제 카드를 눌렀을 때 시트에 넘길 것 전부.
 *
 * 셋을 한 번에 주는 이유 — 셋이 같은 판단 하나에서 나온다. "이 축제를 시트로 열면
 * 어떻게 보여야 하는가" 다. 부르는 쪽마다 따로 조립하면 홈과 discover 에서 같은 축제가
 * 다른 기간 글자로, 다른 비율로 열린다.
 *
 * **부르는 쪽은 결과를 state 에 담아 한 번만 만들어야 한다.** 렌더 중에 다시 부르면
 * item 이 매 렌더 새 객체라 시트의 useEffect([item]) 가 끝없이 다시 돌고
 * TourAPI 호출이 멈추지 않는다 (AttractionDetailSheet.tsx:260-278).
 */
export function festivalSheetProps(festival: Festival): {
  item: Attraction;
  meta: string;
  imageAspect: CardAspect;
} {
  const period = formatFestivalPeriod(festival);
  const status = festivalStatusLabel(festival);

  return {
    item: festivalAsAttraction(festival),
    // 기간을 못 읽으면 상태만 남긴다 — 8자리가 아닌 날짜가 오는 경우가 있다 (FestivalCard.tsx:47)
    meta: period ? `${status} · ${period}` : status,
    // 축제 카드가 세로 포스터라 시트도 같은 비율로 연다. 카드 쪽 값은 FestivalCard.tsx:124 다
    imageAspect: "3/4",
  };
}
