"use client";

// ─── Nearby Attractions ───────────────────────────────────────────────────────
// 시안(reCree Contest.dc.html :885)의 TourismRow 자리. 시안에는 슬롯만 있고
// 카드 내부가 없어, 규칙은 장소 추가 시트(PlaceAddSheet.tsx:140-194)에서 가져와
// 세로 한 줄을 가로 카드로 옮겼다 — 사진 없으면 칩+아이콘, 영문 위 국문 아래.
//
// 색은 시트 것을 가져오지 않는다. journeys/_constants.ts 는 스스로 밝히듯
// journeyView 시안의 색 토큰이고, 포스트 상세는 Tailwind 시맨틱 토큰으로 지어져 있다.
// 한 화면에 색 체계 두 개를 섞지 않는다.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import { fetchNearbyAttractions } from "@/app/(user)/_actions/tour-actions";
import type { Attraction } from "@/lib/tour-api/types";

interface Props {
  lat: number;
  lng: number;
  /** 무엇의 주변인지. 이 섹션은 페이지 꼬리라 기준을 말해 주는 LocationCard 와 멀다 */
  placeLabel: string;
}

/**
 * 카드 글상자의 고정 높이.
 *
 * 국문이 없는 항목(영문 응답에 괄호가 없던 것)과 영문이 한 줄인 항목이 섞이면
 * 가로 스크롤 아랫단이 들쭉날쭉해진다. 영문 2줄 + 국문 1줄 자리를 비어 있어도 남긴다.
 * 13px×1.3×2 + 3 + 11.5px×1.25 ≈ 52.
 */
const TEXT_H = "h-[52px]";

/** 리크리샷 카드(PostReCreeshotSection.tsx:58)와 같은 폭 — 한 화면의 가로 줄 둘이 같은 리듬으로 움직인다 */
const CARD_W = "w-[140px]";

function AttractionCard({ item }: { item: Attraction }) {
  return (
    <div className={`${CARD_W} flex-none`}>
      {item.imageUrl ? (
        /* unoptimized 판정은 PlaceAddSheet.tsx:145 와 같다 — 등록되지 않은 호스트를
           next/image 에 그대로 넘기면 이미지 하나가 아니라 페이지가 죽는다 */
        <Image
          src={item.imageUrl}
          alt=""
          width={140}
          height={105}
          unoptimized={isExternalImage(item.imageUrl)}
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

      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {/* 거리(distanceM)가 아니라 국문명이다. 거리 표기는 쓰지 않기로 했고,
            국문명은 해외 팬이 표지판을 읽거나 기사에게 보여줄 수 있는 값이다.
            영문이 주고 국문이 확인용이라는 순서는 시트와 같게 둔다 */}
        {item.titleKo && (
          <p className="mt-[3px] truncate text-[11.5px] font-medium leading-[1.25] text-muted-foreground">
            {item.titleKo}
          </p>
        )}
      </div>
    </div>
  );
}

/** 스피너가 아니라 스켈레톤인 이유 — 바로 아래가 댓글이라 높이가 늘면 댓글이 밀린다 */
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

export function NearbyAttractionsSection({ lat, lng, placeLabel }: Props) {
  const [items, setItems] = useState<Attraction[] | "failed" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /**
   * 화면에 들어올 때 한 번만 켠다. 이 섹션은 포스트 맨 아래, 댓글 바로 위다 —
   * 배너만 보고 나가는 사람 몫의 TourAPI 호출과 (영문이 얇은 지역이면) 번역 호출을
   * 아끼려는 것이다. InfiniteFeed.tsx:69 가 같은 방식으로 다음 페이지를 부른다.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || started) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      // 스크롤이 닿기 조금 전에 시작해 빈 자리를 보는 시간을 줄인다
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    fetchNearbyAttractions({ lat, lng }).then((result) => {
      if (alive) setItems(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [started, lat, lng, attempt]);

  /**
   * 0건이면 자리를 비운다. 시트에서는 "못 찾았다"가 답이 된다 — 사용자가 담을 곳을
   * 찾고 있었으니까. 여기서는 물어본 적이 없어서 빈 섹션이 답이 아니라 소음이다.
   *
   * 실패는 반대로 남긴다. 재시도라는 할 일이 남아 있고, 조용히 사라지면
   * "원래 주변에 없는 곳"과 구분되지 않는다. 시안도 이 실패 상태를 따로 두었다
   * (dc.html :1742 "Tourism section fails — post").
   */
  if (Array.isArray(items) && items.length === 0) return null;

  const failed = items === "failed";

  return (
    <section ref={sectionRef} className="mt-6">
      <div className="px-4 mb-2">
        <p className="text-sm font-bold">Nearby Attractions</p>
        <p className="text-xs text-muted-foreground mt-0.5">Around {placeLabel}</p>
      </div>

      {failed ? (
        <div className="mx-4 rounded-2xl border border-secondary bg-white px-4 py-6 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load nearby attractions</p>
          <p className="text-xs text-muted-foreground mt-1">
            The tourism service isn&apos;t responding.
          </p>
          <button
            type="button"
            onClick={() => {
              setItems(null);
              setAttempt((n) => n + 1);
            }}
            className="mt-3 h-9 rounded-full bg-muted px-4 text-xs font-semibold hover:bg-secondary transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* 가로 스크롤은 PostReCreeshotSection.tsx:53 과 같은 형태 —
              같은 화면의 두 줄이 같은 여백·같은 스크롤바 처리로 움직인다 */}
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {items === null
              ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
              : items.map((item) => <AttractionCard key={item.contentId} item={item} />)}
          </div>

          {/* 목록 아래에 한 번. 시안 :756 과 시트 :608 이 같은 자리에 둔다 */}
          <p className="px-4 pt-2.5 text-[10.5px] font-medium text-muted-foreground">
            {TOUR_API_ATTRIBUTION}
          </p>
        </>
      )}
    </section>
  );
}
