"use client";

// ─── Near here ────────────────────────────────────────────────────────────────
// 내 위치 버튼(FAB)을 눌렀을 때만 서는 줄. 누르기 전에는 아무것도 없다 —
// 자리도 제목도 두지 않는다.
//
// ## 좌표를 어디까지 내보내는가 (필수 규칙)
//
// 브라우저 geolocation 의 원본 좌표는 **서버로 가지 않는다.** 그 값이 닿는 곳은 둘뿐이다:
//   1. mapRef.focusCamera — 지도를 그 자리로 옮긴다. 브라우저 안이다
//   2. InteractiveMap 의 userLocation 점 — 역시 브라우저 안이다
//
// 서버로 가는 것은 지도가 옮겨 간 중심을 **소수 둘째 자리로 반올림한 값**뿐이다
// (ExploreMapView 의 roundForServer). 0.01도는 위도로 약 1.1km 라, 반경 5km 조회의
// 기준점으로는 차이가 없고 집을 특정하는 데는 쓸 수 없다.
// 반올림은 부르는 쪽에서 끝내 놓고 이 컴포넌트는 그 결과만 받는다 — 원본이 이 파일에
// 들어오지 않아야 실수로 액션에 넘기는 길 자체가 없다.
//
// ## 나머지
// 조회·캐시·카드는 포스트 상세의 Nearby Attractions 와 같은 것을 쓴다
// (fetchNearbyAttractions — 반경 5km, 거리순). 탭하면 같은 상세 시트가 열린다.

import { useEffect, useState } from "react";
import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import { attractionCategoryLabel } from "@/lib/tour-api/category";
import { CARD_W, TEXT_H, CardImage } from "@/components/tour/CardImage";
import { fetchNearbyAttractions, fetchRegionFestivals } from "@/app/(user)/_actions/tour-actions";
import { FestivalCard } from "@/components/tour/FestivalCard";
import { festivalSheetProps } from "@/components/tour/festival-detail";
import type { CardAspect } from "@/components/tour/CardImage";
import type { Attraction, Festival } from "@/lib/tour-api/types";
import { AttractionDetailSheet } from "@/app/(user)/posts/[slug]/_components/AttractionDetailSheet";

/** 반올림이 끝난 좌표. 원본 GPS 는 이 타입으로 들어오지 않는다 */
export type RoundedCenter = { lat: number; lng: number };

/**
 * 축제 줄이 쓸 지역. 축제는 **지역 코드로만** 조회할 수 있어(searchFestival2 는
 * lDongRegnCd 를 받고 좌표를 받지 않는다) 좌표만으로는 부를 수 없다.
 * 부르는 쪽이 지금 걸린 지역, 없으면 지도 중심에서 가장 가까운 장소의 Area 로 역산해 준다.
 *
 * 어느 쪽이든 아래 Festivals 줄이 이미 부르는 것과 **같은 인자**라, getFestivals 의
 * unstable_cache 를 그대로 맞는다 — 이 줄 때문에 TourAPI 호출이 늘지 않는다.
 */
export type NearHereRegion = { regionKey: string; district: string | null };

/**
 * 축제를 주워 담을 반경. 10km 로 먼저 훑고, 한 건도 없으면 20km 로 넓힌다.
 *
 * 넓히는 것이 공짜인 이유는 조회가 이미 끝났기 때문이다 — 받아 온 목록을 다시 거를
 * 뿐이라 TourAPI 를 한 번 더 부르지 않는다.
 *
 * 20km 에서도 0이면 줄을 숨긴다. 그 이상 넓히면 "nearby" 가 거짓말이 된다.
 *
 * 실측(서울, 시청 좌표 기준): 진행 중 + 60일 내 40건 중 10km 안에 32건, 20km 안에 40건.
 * 서울에서는 첫 반경에서 끝나고, 폴백은 장소가 흩어진 지방에서 일한다.
 */
const FESTIVAL_RADII_M = [10_000, 20_000] as const;

const EARTH_R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** 두 좌표 사이 거리(m). 10km 안쪽 판정이라 구면 근사로 충분하다 */
function distanceM(a: RoundedCenter, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function SkeletonCard() {
  return (
    <div className={`${CARD_W} shrink-0 animate-pulse`}>
      <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
      <div className={`mt-2 ${TEXT_H} space-y-1.5`}>
        <div className="h-[13px] w-full rounded bg-muted" />
        <div className="h-[13px] w-3/5 rounded bg-muted" />
      </div>
    </div>
  );
}

/** 포스트 상세 Nearby 카드와 같은 규칙 — 4:3 사진 · 영문 2줄 · 아랫줄 한 줄 */
function NearbyCard({
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
      className={`${CARD_W} shrink-0 text-left active:opacity-70 transition-opacity`}
    >
      <CardImage url={item.imageUrl} aspect="4/3" />
      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {category && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            {category}
          </p>
        )}
      </div>
    </button>
  );
}

export function NearHereSection({
  center,
  region,
}: {
  center: RoundedCenter | null;
  region: NearHereRegion | null;
}) {
  const [items, setItems] = useState<Attraction[] | "failed" | null>(null);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selected, setSelected] = useState<{
    item: Attraction;
    trigger: HTMLElement;
    meta?: string;
    imageAspect?: CardAspect;
  } | null>(null);

  // 기준점이 바뀌면 부르는 쪽이 key 로 이 줄을 새로 만든다 — 여기서 이전 결과를
  // 지우지 않아도 상태가 새로 시작한다
  useEffect(() => {
    if (!center) return;
    let alive = true;
    fetchNearbyAttractions({ lat: center.lat, lng: center.lng }).then((result) => {
      if (alive) setItems(result === null ? "failed" : result);
    });
    return () => {
      alive = false;
    };
  }, [center]);

  /**
   * 축제 — 지역 단위로 받아 좌표로 거른다.
   *
   * 반경 조회가 없는 자리라 이 방법뿐이다. 받아 온 목록은 이미 "진행 중 + 60일 내 예정"
   * 으로 걸러진 것이고(tour-actions 의 FESTIVAL_UPCOMING_DAYS), 여기서는 거리만 본다.
   * 좌표가 없는 축제는 거리를 잴 수 없어 뺀다.
   */
  useEffect(() => {
    if (!center || !region) return;
    let alive = true;
    fetchRegionFestivals({ regionKey: region.regionKey, district: region.district }).then(
      (result) => {
        if (!alive || result === null) return;
        // 거리를 한 번만 재고 정렬해 둔 뒤, 반경만 바꿔 가며 자른다
        const measured = result
          .map((f) =>
            f.lat === null || f.lng === null
              ? null
              : { festival: f, distance: distanceM(center, { lat: f.lat, lng: f.lng }) },
          )
          .filter((r): r is { festival: Festival; distance: number } => r !== null)
          .sort((a, b) => a.distance - b.distance);

        const near =
          FESTIVAL_RADII_M.map((radius) => measured.filter((r) => r.distance <= radius)).find(
            (list) => list.length > 0,
          ) ?? [];
        setFestivals(near.map((r) => r.festival));
      },
    );
    return () => {
      alive = false;
    };
  }, [center, region]);

  // 버튼을 누르기 전에는 섹션 자체가 없다
  if (!center) return null;
  // 실패는 조용히 접는다. 시트 맨 위라 재시도 카드가 뜨면 아래 줄들이 전부 밀린다 —
  // 버튼을 다시 누르면 그대로 다시 조회된다
  if (items === "failed") return null;
  // 관광지가 0건이어도 축제가 있으면 섹션은 남는다 — 둘은 각자 서고 각자 접힌다
  const noAttractions = Array.isArray(items) && items.length === 0;
  if (noAttractions && festivals.length === 0) return null;

  return (
    <section className="mt-4 border-t border-secondary pt-4">
      {!noAttractions && (
        <>
          <p className="px-4 text-sm font-bold">Near here</p>
          <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {items === null
              ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
              : items.map((item) => (
                  <NearbyCard
                    key={item.contentId}
                    item={item}
                    onSelect={(picked, trigger) => setSelected({ item: picked, trigger })}
                  />
                ))}
          </div>
        </>
      )}

      {/* 축제는 관광지 줄 아래. 0건이면 이 줄만 사라진다 */}
      {festivals.length > 0 && (
        <>
          <p className={`px-4 text-sm font-bold ${noAttractions ? "" : "mt-4"}`}>
            Festivals nearby
          </p>
          <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {festivals.map((festival) => (
              <FestivalCard
                key={festival.contentId}
                item={festival}
                onSelect={(picked, trigger) =>
                  setSelected({ ...festivalSheetProps(picked), trigger })
                }
              />
            ))}
          </div>
        </>
      )}

      {/* 두 줄이 같이 쓰는 출처 표기 — 목록 아래에 한 번 */}
      <p className="px-4 pt-2.5 text-[10.5px] font-medium text-muted-foreground">
        {TOUR_API_ATTRIBUTION}
      </p>

      <AttractionDetailSheet
        item={selected?.item ?? null}
        trigger={selected?.trigger ?? null}
        meta={selected?.meta}
        imageAspect={selected?.imageAspect}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
