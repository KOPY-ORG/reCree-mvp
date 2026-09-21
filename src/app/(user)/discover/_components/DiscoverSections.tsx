"use client";

// ─── discover 시트 섹션들 ─────────────────────────────────────────────────────
// 장소 목록 **위에** 얹는 줄들이다. 결과 모드 분기(ExploreMapView 의 목록 렌더)는
// 그대로 두고 그 앞에 붙는다 — 목록을 대체하지 않는다.
//
// 범위는 지도 위치가 아니라 "지금 걸린 조건"이다: 토픽 칩·필터, 지역, 카테고리.
// 아무것도 없으면 전국이다. 카메라(onIdle·bounds)를 읽는 코드는 여기 없다.
//
// 순서 — recreeshots · Trending districts · Festivals · Journeys · Attractions.
// 이 위로는 부르는 쪽이 직접 그린다: 카테고리 칩(시트 헤더) · Near here · 여정 생성 CTA ·
// 장소 목록 처음 여섯. 이 줄들은 그 여섯 뒤에 끼고, 나머지 목록이 이어진다.
//
// 이벤트 모드·저장 목록 보기에서는 부르는 쪽이 통째로 걷어 낸다. 이벤트 모드는 컬렉션이
// 화면을 다 쓰는 상태고, 저장 목록은 "내가 저장한 것"이라는 약속이 깨진다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { CourseCard } from "../../journeys/_components/CourseCard";
import type { CourseListItem } from "@/lib/course-queries";
import type { DistrictOption } from "../_hooks/useDiscoverFilters";
import {
  fetchDiscoverJourneys,
  fetchRegionReCreeshots,
  type DiscoverShot,
} from "../_actions/discover-section-actions";
import { RegionTourSections } from "./RegionTourSections";
import { TrendingDistricts } from "./TrendingDistricts";

/** 여정 카드 폭 — 홈 JourneySection 과 같은 값 */
const JOURNEY_CARD_W = "w-[180px]";

/**
 * 도착하기 전에 자리를 잡아 둔다 (⑤).
 *
 * 시트는 스크롤 위치를 저장·복원하는데, 섹션이 나중에 들어오며 높이가 늘면
 * 복원한 위치가 다른 것을 가리킨다. 빈 자리를 미리 띄워 두면 도착 전후로 높이가 같다.
 *
 * 0건이라 숨겨질 줄에서는 이 자리도 사라진다 — 그때는 한 번 줄었다가 끝이고,
 * 계속 들썩이지 않는다.
 */
function RowSkeleton({ cardClassName }: { cardClassName: string }) {
  return (
    <section className="mt-4 border-t border-secondary pt-4">
      <div className="mx-4 h-[18px] w-32 rounded bg-muted" />
      <div className="mt-2 flex gap-2.5 overflow-hidden px-4 pb-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`shrink-0 animate-pulse rounded-xl bg-muted ${cardClassName}`} />
        ))}
      </div>
    </section>
  );
}

/** 지금 걸린 조건. 바뀌면 줄들이 다시 조회한다 */
export type SectionScope = {
  regionKey: string | null;
  district: string | null;
  topicIds: string[];
};

export function DiscoverSections({
  scope,
  regionLabel,
  districts,
  onSelectDistrict,
}: {
  scope: SectionScope;
  /** 제목에 넣을 지역 이름. 전국이면 null */
  regionLabel: string | null;
  /** Trending districts 용 — 지금 시도의 시군구 목록 (장소 수 내림차순) */
  districts: readonly DistrictOption[];
  onSelectDistrict: (slug: string) => void;
}) {
  const [shots, setShots] = useState<DiscoverShot[] | null>(null);
  const [journeys, setJourneys] = useState<CourseListItem[] | null>(null);

  /**
   * 조건이 바뀌면 부르는 쪽이 key 로 이 컴포넌트를 새로 만든다 (ExploreMapView).
   * 그래서 여기에 "이전 결과 지우기" 코드가 없다 — 상태가 통째로 새로 시작하므로
   * 옛 지역의 카드가 새 제목 아래 한 프레임도 남지 않는다.
   * RegionTourSections 가 같은 문제를 같은 방법으로 푼다.
   */
  useEffect(() => {
    let alive = true;
    fetchRegionReCreeshots(scope).then((result) => {
      if (alive) setShots(result ?? []);
    });
    return () => {
      alive = false;
    };
    // scope 는 key 가 고정하므로 이 컴포넌트가 사는 동안 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDiscoverJourneys(scope).then((result) => {
      if (alive) setJourneys(result ?? []);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inLabel = regionLabel ? ` in ${regionLabel}` : "";

  return (
    <div>
      {/* 1. recreeshots — 0건이면 숨긴다. 홈과 달리 권유 카드를 두지 않는다:
             지역·토픽으로 좁힌 자리라 "그 조건에 아직 없다"가 맞는 말이고,
             조건과 무관한 권유가 끼어들 이유가 없다 (홈 토픽 탭과 같은 판단) */}
      {shots === null ? (
        <RowSkeleton cardClassName="w-[120px] aspect-[4/5]" />
      ) : shots.length > 0 ? (
        <section className="mt-4 border-t border-secondary pt-4">
          <HScrollSection title={`recreeshots${inLabel}`}>
            {shots.map((shot) => (
              <Link
                key={shot.id}
                href={`/recreeshot/${shot.id}`}
                className="block w-[120px] shrink-0"
              >
                <ReCreeshotImage
                  shotUrl={shot.imageUrl}
                  variant="thumb-sm"
                  className="aspect-[4/5] [filter:drop-shadow(0_3px_5px_rgba(0,0,0,0.18))]"
                  sizes="120px"
                />
              </Link>
            ))}
          </HScrollSection>
        </section>
      ) : null}

      {/* 2. Trending districts — 시도만 걸렸을 때. 시군구가 걸렸으면 스스로 물러난다 */}
      {scope.regionKey && !scope.district && (
        <TrendingDistricts districts={districts} onSelectDistrict={onSelectDistrict} />
      )}

      {/* 3. Festivals — 지역이 있을 때만. 코드 없는 지역이면 스스로 빠진다.
             key 는 지역이 바뀔 때 상태를 초기화한다 (⑥) */}
      {scope.regionKey && (
        <RegionTourSections
          key={`festivals/${scope.regionKey}/${scope.district ?? ""}`}
          regionKey={scope.regionKey}
          district={scope.district}
          only="festivals"
        />
      )}

      {/* 4. Journeys — 지역이 걸리면 그 지역의 장소가 담긴 여정만. 0건이면 숨긴다
             (recreeshots 와 같은 규칙). 전국 목록은 지역을 고르지 않은 기본 화면에서만
             나오고, 그때만 제목에 지역이 붙지 않는다 */}
      {journeys === null ? (
        <RowSkeleton cardClassName="w-[180px] h-[150px]" />
      ) : journeys.length > 0 ? (
        <section className="mt-4 border-t border-secondary pt-4">
          <HScrollSection title={`Journeys${inLabel}`} moreHref="/journeys">
            {journeys.map((course) => (
              <div key={course.id} className={`${JOURNEY_CARD_W} shrink-0`}>
                <CourseCard course={course} />
              </div>
            ))}
          </HScrollSection>
        </section>
      ) : null}

      {/* 5. Attractions — 맨 아래. reCree 가 본체이고 관광 데이터는 그 주변 맥락이라는
             것이 순서로 표현된 것이라 위로 올리지 않는다 */}
      {scope.regionKey && (
        <RegionTourSections
          key={`attractions/${scope.regionKey}/${scope.district ?? ""}`}
          regionKey={scope.regionKey}
          district={scope.district}
          only="attractions"
        />
      )}
    </div>
  );
}
