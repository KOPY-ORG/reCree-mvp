"use client";

// ─── Trending districts ───────────────────────────────────────────────────────
// 지금 고른 시도 안에서 장소가 많은 시군구를 칩으로 세운다.
//
// 프로토타입(DiscoverCity.html)은 "누르면 지도가 그 구로 확대"였다. 여기서는
// district 필터를 거는 것으로 바꿨다 — 카메라 위치에 기대지 않기로 한 범위 규칙과
// 같은 값이다. 필터가 걸리면 지도는 그 구의 마커로 알아서 맞춰진다
// (InteractiveMap 의 regionKey 가 그 일을 한다).
//
// 새 쿼리가 없다. 시트가 이미 들고 있는 allPlaces 를 세기만 한다 —
// useDiscoverFilters 의 availableDistricts 가 같은 집계를 이미 해 두었고,
// 이 줄은 그것을 그리기만 한다.
//
// 시군구를 이미 골랐으면 서지 않는다. 고른 구 하나만 남은 줄은 고를 것이 없다.

import type { DistrictOption } from "../_hooks/useDiscoverFilters";

/** 한 줄에 너무 많이 세우지 않는다. 장소 수 내림차순이라 앞쪽이 곧 "trending" 이다 */
const MAX_CHIPS = 8;

export function TrendingDistricts({
  districts,
  onSelectDistrict,
}: {
  /** 장소 수 내림차순 (useDiscoverFilters.availableDistricts 가 정한 순서) */
  districts: readonly DistrictOption[];
  onSelectDistrict: (slug: string) => void;
}) {
  // 하나뿐이면 "어디가 몰리는가" 라는 질문이 성립하지 않는다 — 통째로 숨긴다
  if (districts.length < 2) return null;

  const shown = districts.slice(0, MAX_CHIPS);

  return (
    <section className="mt-4 border-t border-secondary pt-4">
      <p className="px-4 text-sm font-bold">Trending districts</p>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {shown.map((district) => (
          <button
            key={district.slug}
            type="button"
            onClick={() => onSelectDistrict(district.slug)}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 rounded-full bg-muted px-3.5 text-sm font-semibold whitespace-nowrap transition-colors active:opacity-70"
          >
            {district.label}
            {/* 수를 같이 적는다 — 순서가 왜 이런지를 칩 스스로 말한다 */}
            <span className="text-xs font-medium text-muted-foreground">{district.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
