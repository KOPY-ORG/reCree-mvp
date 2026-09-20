import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { FestivalCard } from "@/components/tour/FestivalCard";
import { fetchRegionFestivals } from "../../_actions/tour-actions";

/**
 * 지금 서울에서 열리고 있는 축제 (출처: ⓒ한국관광공사).
 *
 * 페이지에서 props 를 받지 않고 스스로 조회한다 (FollowFeedSection 과 같은 패턴).
 * 이 줄은 TourAPI 를 타서 캐시가 비면 최악 12초(4초 × 3페이지)에 번역 5초가 더 붙는다 —
 * 페이지의 Promise.all 에 넣으면 홈 전체가 그만큼 늦어진다. 페이지는 <Suspense> 로
 * 감싸기만 하고 기다리지 않는다.
 */

/** 서울 고정. 지역 코드가 아니라 슬러그다 — Area.nameEn 을 소문자로 내린 값이고
 *  fetchRegionFestivals 안에서 placeRegionOf 가 lDongRegnCd 로 옮긴다.
 *  코드(11)를 여기 적으면 관광공사 코드 체계를 홈이 알게 된다 */
const REGION_KEY = "seoul";

const TITLE = "Festivals in Seoul";

export async function FestivalSection() {
  // 서버 액션이지만 서버에서 부르면 그냥 함수 호출이다. getFestivals 를 직접 부르지
  // 않는 이유는 개수 상한·예정일 범위·https 치환이 전부 저 함수 안에 있어서다 —
  // 직접 부르면 그 셋을 여기 한 벌 더 적게 된다.
  const festivals = await fetchRegionFestivals({ regionKey: REGION_KEY });

  // null 은 조회 실패다 (throw 하지 않는다 — tour-actions.ts:209).
  // 실패든 0건이든 화면에서는 같은 상태라 통째로 사라진다. 홈에 재시도 버튼을 두지 않는다
  if (festivals === null) return null;

  // "오늘 열리는" 이 이 줄의 전부다. fetchRegionFestivals 는 60일 이내 예정까지 주므로
  // 여기서 거른다 — 예정이 섞이면 제목이 약속하는 것과 내용이 어긋난다
  const ongoing = festivals.filter((f) => f.status === "ongoing");
  if (ongoing.length === 0) return null;

  return (
    <div>
      {/* moreHref 를 넘기지 않는다 — 축제 전체 목록 화면이 없다 */}
      <HScrollSection title={TITLE}>
        {ongoing.map((festival) => (
          <FestivalCard key={festival.contentId} item={festival} href="/discover" />
        ))}
      </HScrollSection>

      {/* 출처 표기는 요강상 빼먹을 수 없다. discover 와 같은 자리(목록 아래 한 번)·같은 글자다.
          -mt-4 는 HScrollSection 이 스스로 가진 mb-6 을 되물러 카드에 붙이는 것이고,
          mb-6 으로 다음 섹션과의 간격을 그 섹션이 주던 만큼 돌려놓는다 */}
      <p className="-mt-4 mb-6 px-4 text-[10.5px] font-medium text-muted-foreground">
        {TOUR_API_ATTRIBUTION}
      </p>
    </div>
  );
}
