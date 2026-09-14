"use client";

// ─── 맵 시트의 지역 관광 데이터 ───────────────────────────────────────────────
// 시안(reCree Contest.dc.html :1889-1892)의 sheetTourism 자리 —
// "Attractions in {도시}" 와 "Festivals in {도시}" 두 줄이다.
// 시안은 도시 시트 맨 아래, 자체 섹션(SectionRow) 전부 뒤에 둔다. 그 순서를 지킨다.
//
// 지역이 정해졌을 때만 산다. 전국 관광지 스무 건은 고른 것이 아니라 API 가 준 순서라
// 맥락이 없다 — 지역을 고르면 나타나는 편이 맞다. 그래서 부르는 쪽이 region 이 있을
// 때만 그리고, 표(tour-api/regions)에 코드가 없는 지역이면 여기서 스스로 물러난다.
//
// 카드 생김새는 시안에서 가져올 수 없다. TourismRow 가 dc-import 라 내부가 없어서,
// C-3b(NearbyAttractionsSection)가 세운 규칙 — 4:3 사진 · 영문 2줄 · 아랫줄 한 줄 —
// 을 그대로 따른다. 같은 성격의 데이터가 화면마다 다르게 생기지 않게.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import { placeRegionOf } from "@/lib/tour-api/regions";
import {
  fetchRegionAttractions,
  fetchRegionFestivals,
} from "@/app/(user)/_actions/tour-actions";
import type { Attraction, Festival } from "@/lib/tour-api/types";
import { AttractionDetailSheet } from "@/app/(user)/posts/[slug]/_components/AttractionDetailSheet";

/** C-3b 와 같은 값 — 한 서비스 안에서 관광지 카드는 어디서나 같은 크기다 */
const CARD_W = "w-[140px]";
const TEXT_H = "h-[52px]";

type Loadable<T> = T[] | "failed" | null;

// ─── 축제 날짜 · 상태 ─────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthDay(yyyymmdd: string): string | null {
  const month = MONTHS[Number(yyyymmdd.slice(4, 6)) - 1];
  if (!month) return null;
  return `${month} ${Number(yyyymmdd.slice(6, 8))}`;
}

/**
 * "20260918" 두 개를 사람이 읽는 한 줄로.
 *
 * 진행중이면 시작일을 버리고 끝나는 날만 쓴다 — "Until Dec 31".
 * 범위로 쓰면 거짓말이 되기 때문이다. searchFestival2 의 진행중 목록은 대부분 상설
 * 프로그램이라 몇 해 전에 시작한 것이 섞인다 (실측: 서울 진행중 12건 중 12건이 연 단위,
 * 그중 "페인터즈"는 2022-11-01 시작). 해를 감춘 "Nov 1 – Dec 31" 은 올해 그 날짜에
 * 시작한 것처럼 읽힌다. 그리고 이미 하고 있는 것에서 알고 싶은 것은 언제까지인가 하나다.
 *
 * 예정이면 범위 그대로.
 *   같은 날   Sep 19
 *   같은 달   Sep 18 – 20
 *   다른 달   Sep 24 – Oct 24
 *
 * 끝나는 해가 올해가 아닐 때만 연도를 붙인다. 30일 안에 시작하는 것만 올라오므로
 * 시작 쪽에 연도가 필요한 경우는 없고, 해를 넘겨 끝나는 것만 "Dec 20 – Jan 5, 2027" 이 된다.
 */
function formatFestivalPeriod(festival: Festival): string | null {
  const { startDate, endDate, status } = festival;
  if (!/^\d{8}$/.test(startDate) || !/^\d{8}$/.test(endDate)) return null;

  const start = monthDay(startDate);
  const end = monthDay(endDate);
  if (!start || !end) return null;

  const yearSuffix = endDate.slice(0, 4) === String(new Date().getFullYear()) ? "" : `, ${endDate.slice(0, 4)}`;

  if (status === "ongoing") return `Until ${end}${yearSuffix}`;
  if (startDate === endDate) return `${start}${yearSuffix}`;
  if (startDate.slice(0, 6) === endDate.slice(0, 6)) {
    return `${start} – ${Number(endDate.slice(6, 8))}${yearSuffix}`;
  }
  return `${start} – ${end}${yearSuffix}`;
}

/**
 * 뱃지 글자. 날짜만으로는 "지금 갈 수 있는지"를 세어 봐야 알 수 있다 —
 * 그 한 번의 계산을 없애는 것이 status 의 쓸모다.
 *
 * upcoming 은 startDate > 오늘 이 성립할 때만 붙으므로 daysUntilStart 가 1 이상이다.
 */
function festivalStatusLabel(festival: Festival): string {
  if (festival.status === "ongoing") return "Now on";
  if (festival.daysUntilStart <= 1) return "Tomorrow";
  return `In ${festival.daysUntilStart} days`;
}

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
  };
}

// ─── 카드 ─────────────────────────────────────────────────────────────────────

function CardImage({ url, children }: { url: string | null; children?: React.ReactNode }) {
  return (
    <div className="relative">
      {url ? (
        /* unoptimized 판정은 C-3b 와 같다 — 등록되지 않은 호스트를 next/image 에
           그대로 넘기면 이미지 하나가 아니라 페이지가 죽는다 */
        <Image
          src={url}
          alt=""
          width={140}
          height={105}
          unoptimized={isExternalImage(url)}
          className="aspect-[4/3] w-full rounded-xl bg-muted object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted"
        >
          <MapPin className="size-5 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 아랫줄이 국문명이다.
 *
 * C-3b 는 같은 자리에 거리를 넣고 국문명을 뺐다. 훑어보는 자리에서 읽을 수 없는 글자는
 * 잡음이고 거리는 "여기 온 김에" 갈지를 바로 정해 준다는 이유였다. 여기서는 그 거리가
 * 없다 — areaBasedList2 는 dist 를 주지 않는다. 좌표 기준점 자체가 없으니 만들 수도 없다.
 *
 * 남은 후보는 국문명과 주소인데, 주소는 영문 응답에만 있고 국문 응답 항목은 null 이라
 * 한 줄에서 어떤 카드는 주소가 있고 어떤 카드는 없다. 국문명은 두 경로 다 대체로 찬다.
 * 줄을 비우는 것보다 낫고, 현지에서 이름을 대야 할 때 유일하게 쓰이는 글자다.
 */
function AttractionCard({
  item,
  onSelect,
}: {
  item: Attraction;
  onSelect: (item: Attraction, trigger: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onSelect(item, e.currentTarget)}
      className={`${CARD_W} flex-none text-left transition-opacity active:opacity-70`}
    >
      <CardImage url={item.imageUrl} />
      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {item.titleKo && (
          <p className="mt-[3px] truncate text-[11.5px] font-medium leading-[1.25] text-muted-foreground">
            {item.titleKo}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * 축제 카드는 관광지 카드와 두 군데가 다르다.
 *
 *   사진 위 뱃지  상태. 진행중은 브랜드색, 예정은 검정 — 한 줄을 훑으며 "지금 하는 것"만
 *                 골라내는 것이 축제를 보는 유일한 방식이다. 글줄에 섞으면 세어야 한다
 *   아랫줄        기간. 관광지의 국문명 자리다
 *
 * 뱃지와 아랫줄을 합쳐 한 줄로 쓰지 않는다. 카드 폭이 140px 이라
 * "Now on · Sep 12 – 21" 은 잘린다.
 */
function FestivalCard({
  item,
  onSelect,
}: {
  item: Festival;
  onSelect: (item: Festival, trigger: HTMLElement) => void;
}) {
  const period = formatFestivalPeriod(item);
  const ongoing = item.status === "ongoing";

  return (
    <button
      type="button"
      onClick={(e) => onSelect(item, e.currentTarget)}
      className={`${CARD_W} flex-none text-left transition-opacity active:opacity-70`}
    >
      <CardImage url={item.imageUrl}>
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-[3px] text-[10px] font-semibold leading-none ${
            ongoing ? "bg-brand text-black" : "bg-black/70 text-white"
          }`}
        >
          {festivalStatusLabel(item)}
        </span>
      </CardImage>
      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {period && (
          <p className="mt-[3px] truncate text-[11.5px] font-medium leading-[1.25] text-muted-foreground">
            {period}
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
 */
export function RegionTourSections({ regionKey }: { regionKey: string }) {
  const region = placeRegionOf(regionKey);

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
    fetchRegionAttractions({ regionKey }).then((result) => {
      if (alive) setAttractions(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [started, regionKey, attractionAttempt]);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    fetchRegionFestivals({ regionKey }).then((result) => {
      if (alive) setFestivals(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [started, regionKey, festivalAttempt]);

  // 코드를 모르는 지역이면 두 줄 다 없다. 부르는 쪽이 지역별로 분기하지 않아도 되게
  // 판단을 여기서 끝낸다 — 표(tour-api/regions)를 아는 것은 관광 모듈뿐이다.
  if (region === null) return null;

  return (
    <div ref={rootRef}>
      <TourRow
        title={`Attractions in ${region.label}`}
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
        title={`Festivals in ${region.label}`}
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
