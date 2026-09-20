"use client";

// ─── 맵 시트의 지역 관광 데이터 ───────────────────────────────────────────────
// 시안(reCree Contest.dc.html :1889-1892)의 sheetTourism 자리 —
// "Attractions in {도시}" 와 "Festivals in {도시}" 두 줄이다.
// 시안은 도시 시트 맨 아래, 자체 섹션(SectionRow) 전부 뒤에 둔다. 그 순서를 지킨다.
//
// 지역이 정해졌을 때만 산다. 전국 관광지 스무 건은 고른 것이 아니라 API 가 준 순서라
// 맥락이 없다 — 지역을 고르면 나타나는 편이 맞다. 그래서 부르는 쪽이 region 이 있을
// 때만 그리고, Area 에 법정동 코드가 없는 지역이면 여기서 스스로 물러난다.
// 그 판단은 fetchRegionTourInfo 가 한다 — 코드가 Area 로 옮겨가 동기로 알 수 없다.
//
// 카드 생김새는 시안에서 가져올 수 없다. TourismRow 가 dc-import 라 내부가 없어서,
// C-3b(NearbyAttractionsSection)가 세운 규칙 — 4:3 사진 · 영문 2줄 · 아랫줄 한 줄 —
// 을 그대로 따른다. 같은 성격의 데이터가 화면마다 다르게 생기지 않게.

import { useEffect, useRef, useState } from "react";
import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import { attractionCategoryLabel } from "@/lib/tour-api/category";
import { CARD_W, TEXT_H, CardImage } from "@/components/tour/CardImage";
import {
  FestivalCard,
  festivalStatusLabel,
  formatFestivalPeriod,
} from "@/components/tour/FestivalCard";
import {
  fetchRegionAttractions,
  fetchRegionFestivals,
  fetchRegionTourInfo,
} from "@/app/(user)/_actions/tour-actions";
import type { Attraction, Festival } from "@/lib/tour-api/types";
import { AttractionDetailSheet } from "@/app/(user)/posts/[slug]/_components/AttractionDetailSheet";

type Loadable<T> = T[] | "failed" | null;

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

// ─── 카드 ─────────────────────────────────────────────────────────────────────

/**
 * 아랫줄이 분류다.
 *
 * 포스트 Nearby 는 같은 자리에 거리를 그린다. 거기는 기준점이 있는 목록
 * (locationBasedList2)이라 dist 가 오기 때문이고, 여기는 지역 목록(areaBasedList2)이라
 * dist 가 없다. 부르는 API 가 다르니 부제도 다른 것이 맞다 — 두 카드를 합치지 않는 이유다.
 *
 * 국문명을 쓰다가 바꿨다. 한 지점이 일반 항목과 사후면세점 항목으로 두 번 실리는 경우가
 * 있어(실측 "10꼬르소꼬모 청담점" 2건) 아랫줄이 글자까지 똑같이 겹쳤다. 읽을 수 없는
 * 글자가 겹쳐 있는 것은 훑는 자리에서 잡음일 뿐이다.
 *
 * 표는 tour-api/category 가 갖는다. 코드 체계를 아는 것은 관광 모듈의 일이다.
 */
function AttractionCard({
  item,
  onSelect,
}: {
  item: Attraction;
  onSelect: (item: Attraction, trigger: HTMLElement) => void;
}) {
  const category = attractionCategoryLabel(item);

  return (
    <button
      type="button"
      onClick={(e) => onSelect(item, e.currentTarget)}
      className={`${CARD_W} flex-none text-left transition-opacity active:opacity-70`}
    >
      <CardImage url={item.imageUrl} />
      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {category && (
          <p className="mt-[3px] truncate text-[11.5px] font-medium leading-[1.25] text-muted-foreground">
            {category}
          </p>
        )}
      </div>
    </button>
  );
}

/** 스피너가 아니라 스켈레톤인 이유 — 두 줄이 위아래로 붙어 있어 높이가 늘면 아랫줄이 밀린다 */
function SkeletonCard() {
  return (
    <div className={`${CARD_W} flex-none animate-pulse`}>
      <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
      <div className={`mt-2 ${TEXT_H} space-y-1.5`}>
        <div className="h-[13px] w-full rounded bg-muted" />
        <div className="h-[13px] w-3/5 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── 줄 ───────────────────────────────────────────────────────────────────────

/**
 * 관광 데이터 한 줄. 제목 · 가로 스크롤 · 출처 표기를 묶는다.
 *
 * 0건이면 제목도 구분선도 만들지 않고 통째로 사라진다 — 물어본 적 없는 것에
 * "없습니다"라고 답하는 자리가 아니다 (C-3b 와 같은 판단).
 *
 * 실패는 반대로 남긴다. 재시도라는 할 일이 남아 있고, 조용히 사라지면
 * "원래 없는 지역"과 구분되지 않는다. 시안도 이 상태를 따로 두었다
 * (dc.html :1743 "Tourism section fails — city sheet").
 */
function TourRow<T>({
  title,
  items,
  onRetry,
  renderCard,
}: {
  title: string;
  items: Loadable<T>;
  onRetry: () => void;
  renderCard: (item: T) => React.ReactNode;
}) {
  if (Array.isArray(items) && items.length === 0) return null;

  return (
    <section className="mt-4 border-t border-secondary pt-4">
      <p className="px-4 text-sm font-bold">{title}</p>

      {items === "failed" ? (
        <div className="mx-4 mt-2 rounded-2xl border border-secondary bg-white px-4 py-5 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load this section</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The tourism service isn&apos;t responding.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-9 rounded-full bg-muted px-4 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {items === null ? [0, 1, 2].map((i) => <SkeletonCard key={i} />) : items.map(renderCard)}
          </div>
          {/* 목록 아래에 한 번. C-3b 와 같은 자리다 */}
          <p className="px-4 pt-2.5 text-[10.5px] font-medium text-muted-foreground">
            {TOUR_API_ATTRIBUTION}
          </p>
        </>
      )}
    </section>
  );
}

// ─── 본체 ─────────────────────────────────────────────────────────────────────

/**
 * 두 줄을 각자 부르고 각자 실패시킨다.
 *
 * 하나로 묶어 Promise.all 로 부르지 않는다. 축제는 최대 3페이지를 순차로 받고 번역까지
 * 붙어 관광지보다 한참 늦다 — 묶으면 빠른 쪽이 느린 쪽을 기다리고, 느린 쪽이 죽으면
 * 빠른 쪽까지 같이 죽는다. 요강이 "섹션 실패는 그 섹션만 죽는다"이다.
 *
 * 지역이 바뀌면 부르는 쪽이 key 로 이 컴포넌트를 새로 만든다 — 상태를 되돌리는 코드가
 * 따로 없고, 옛 지역의 카드가 한 프레임도 새 제목 아래 남지 않는다.
 * key 에 시군구도 들어간다. 같은 시도 안에서 구만 갈아탈 때도 같은 보장이 서야 한다.
 */
export function RegionTourSections({
  regionKey,
  district = null,
}: {
  regionKey: string;
  /** 시군구. null 이면 시도 전체다 */
  district?: string | null;
}) {
  /** null = 아직 모름 · "none" = 코드 없는 지역 */
  const [info, setInfo] = useState<{ label: string } | "none" | null>(null);

  const [attractions, setAttractions] = useState<Loadable<Attraction>>(null);
  const [festivals, setFestivals] = useState<Loadable<Festival>>(null);
  const [attractionAttempt, setAttractionAttempt] = useState(0);
  const [festivalAttempt, setFestivalAttempt] = useState(0);
  const [started, setStarted] = useState(false);

  /** 시트는 두 줄이 함께 하나만 쓴다 — 카드마다 두면 Dialog 가 서른 개 마운트된다 */
  const [selected, setSelected] = useState<{
    item: Attraction;
    trigger: HTMLElement;
    meta?: string;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * 화면에 들어올 때 한 번만 켠다. 이 두 줄은 시트 맨 아래라 목록만 훑고 접는 사람이
   * 훨씬 많다 — 그 몫의 TourAPI 호출과 (영문이 얇은 지역이면) 번역 호출을 아낀다.
   * C-3b 와 같은 방식이다.
   */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || started) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    fetchRegionTourInfo({ regionKey, district }).then((result) => {
      if (alive) setInfo(result ?? "none");
    });
    return () => {
      alive = false;
    };
  }, [started, regionKey, district]);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    fetchRegionAttractions({ regionKey, district }).then((result) => {
      if (alive) setAttractions(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [started, regionKey, district, attractionAttempt]);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    fetchRegionFestivals({ regionKey, district }).then((result) => {
      if (alive) setFestivals(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [started, regionKey, district, festivalAttempt]);

  // 코드를 모르는 지역이면 두 줄 다 없다. 부르는 쪽이 지역별로 분기하지 않아도 되게
  // 판단을 여기서 끝낸다 — 지역 코드를 아는 것은 관광 모듈뿐이다.
  //
  // info 가 아직 null 이어도 rootRef 는 살려 둬야 한다. 그게 없으면 IntersectionObserver
  // 가 붙을 곳이 없어 started 가 서지 않고, 호출이 영영 시작되지 않는다.
  if (info === "none") return <div ref={rootRef} />;
  if (info === null) return <div ref={rootRef} />;

  return (
    <div ref={rootRef}>
      <TourRow
        title={`Attractions in ${info.label}`}
        items={attractions}
        onRetry={() => {
          setAttractions(null);
          setAttractionAttempt((n) => n + 1);
        }}
        renderCard={(item) => (
          <AttractionCard
            key={item.contentId}
            item={item}
            onSelect={(picked, trigger) => setSelected({ item: picked, trigger })}
          />
        )}
      />

      <TourRow
        title={`Festivals in ${info.label}`}
        items={festivals}
        onRetry={() => {
          setFestivals(null);
          setFestivalAttempt((n) => n + 1);
        }}
        renderCard={(item) => (
          <FestivalCard
            key={item.contentId}
            item={item}
            onSelect={(picked, trigger) => {
              const period = formatFestivalPeriod(picked);
              const status = festivalStatusLabel(picked);
              setSelected({
                item: festivalAsAttraction(picked),
                trigger,
                meta: period ? `${status} · ${period}` : status,
              });
            }}
          />
        )}
      />

      <AttractionDetailSheet
        item={selected?.item ?? null}
        trigger={selected?.trigger ?? null}
        meta={selected?.meta}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
