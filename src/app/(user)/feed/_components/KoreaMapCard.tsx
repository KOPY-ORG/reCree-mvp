import Link from "next/link";
import { KOREA_PATH_D } from "@/lib/korea-path";
import {
  KOREA_VIEWBOX,
  SIDO_PIN,
  HOTSPOT_CORE_R,
  HOTSPOT_MIN_R,
  HOTSPOT_MAX_R,
  hotspotRadius,
  projectKorea,
} from "@/lib/korea-projection";
import { getPlaceRegionSlug } from "@/lib/region-utils";
import { buildDiscoverHref } from "@/lib/filter-params";
import type { SidoPlaceCount } from "@/lib/area-queries";

/** 칩에 들어가는 상위 지역 수 */
const CHIP_REGION_COUNT = 4;

/**
 * 지도에 찍는 상위 시도 수. 17개를 다 찍으면 이 핀 크기에서 수도권이 한 덩어리가 된다.
 * 카드가 말하는 것은 "어디에 몰려 있나"이지 전국 분포표가 아니라 위에서 몇 개만 찍는다.
 */
const HOTSPOT_COUNT = 8;

/** 지도 폭(px). 높이는 viewBox 비율이 정한다 — 가로가 더 넓어 높이로 잡으면 글자를 밀어낸다 */
const MAP_WIDTH = 160;

/** 후광 번짐. SVG 단위라 viewBox 기준이다 */
const HALO_BLUR = 2.4;
const HALO_FILTER_ID = "korea-hotspot-bloom";

/** 후광 불투명도. 작은 핀일수록 옅다 — 큰 핀이 "더 많다"를 크기와 진하기로 같이 말한다 */
const HALO_OPACITY_MIN = 0.45;
const HALO_OPACITY_MAX = 0.7;

/**
 * 반지름을 그대로 불투명도로 옮긴다. 장소 수를 로그로 누른 결과가 반지름이므로
 * 여기서 다시 count 를 보면 두 축이 서로 다른 곡선을 타게 된다.
 */
function haloOpacity(r: number): number {
  const t = (r - HOTSPOT_MIN_R) / (HOTSPOT_MAX_R - HOTSPOT_MIN_R);
  return HALO_OPACITY_MIN + (HALO_OPACITY_MAX - HALO_OPACITY_MIN) * t;
}

/**
 * discover 의 ?region= 은 Area.nameEn 을 소문자로 내린 값과 정확히 비교된다
 * (region-utils.ts 의 slugifyRegion). 같은 규칙을 두 벌로 적지 않으려고
 * 장소가 아니어도 그 함수를 그대로 쓴다 — 규칙이 바뀌면 같이 바뀌어야 한다.
 */
function regionParam(areaNameEn: string): string | null {
  return getPlaceRegionSlug({ nameEn: areaNameEn, level: 0, parent: null });
}

/** 접힌 지도 — "지도를 연다"는 동작에 붙는다 */
function FoldedMapIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

/** 지도 핀 — "이 지역"에 붙는다 */
function MapPinIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/**
 * 흰 알약 칩. 카드도 흰색이라 경계는 그림자가 만든다 —
 * 테두리를 쓰면 카드 테두리와 같은 선이 두 겹으로 겹친다.
 */
function RegionChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-full bg-background text-foreground text-[13px] font-semibold shadow-[0_2px_10px_rgba(17,12,46,0.12)] transition-opacity active:opacity-70"
    >
      <MapPinIcon size={14} />
      {label}
    </Link>
  );
}

/**
 * "Where fans are going" — 시도별 장소가 몰린 자리를 한 장으로 보여주는 카드 (명세 3.2 2행).
 *
 * 지도 API 를 쓰지 않는다. 윤곽과 핫스팟이 **같은 <svg> 안에** 있어야
 * 컨테이너 비율이 viewBox 와 달라져도 핀이 윤곽에서 떨어지지 않는다 —
 * 오버레이를 position:absolute 로 얹으면 그 순간 둘의 좌표계가 갈라진다.
 *
 * 조회하지 않는다. counts·maxCount 는 페이지가 내려준다 (getSidoPlaceCounts).
 */
export function KoreaMapCard({
  counts,
  maxCount,
  accentColor,
}: {
  counts: SidoPlaceCount[];
  maxCount: number;
  /** 핫스팟 색. Hot 탭은 브랜드색, 토픽 탭은 토픽색을 넘긴다 (E4) */
  accentColor: string;
}) {
  // counts 는 이미 count desc 다 (area-queries.ts:76).
  // 장소가 0곳인 시도는 애초에 counts 에 없다 — Gwangju 가 그 경우다 (area-queries.ts:9-12)
  const hotspots = counts.slice(0, HOTSPOT_COUNT).map((c) => {
    const pin = SIDO_PIN[c.sido];
    const { x, y } = projectKorea(pin.lon, pin.lat);
    return { sido: c.sido, x, y, r: hotspotRadius(c.count, maxCount) };
  });

  const topRegions = counts.slice(0, CHIP_REGION_COUNT).map((c) => ({
    key: c.sido,
    label: c.areaNameEn,
    href: buildDiscoverHref({ region: regionParam(c.areaNameEn) }),
  }));

  return (
    <section className="px-4 mb-6">
      <div className="rounded-[20px] bg-card border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <Link href="/discover" className="flex flex-col gap-1.5 transition-opacity active:opacity-70">
              {/* 20px 은 시안 값이다. 375px 에서 지도 160px 을 빼면 글자 기둥이 120px 뿐이라
                  한 단계만 키워도 "Where / fans are / going" 3줄로 깨진다 */}
              <span className="text-[20px] font-bold leading-[1.2]">Where fans are going</span>
              <span className="text-[13px] leading-[1.4] text-muted-foreground">
                Tap the map to explore spots around Korea
              </span>
            </Link>

            <Link
              href="/discover"
              className="mt-1 self-start inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-full bg-foreground text-background text-[14px] font-semibold transition-opacity active:opacity-70"
            >
              <FoldedMapIcon size={15} />
              Open map
            </Link>
          </div>

          {/* 육지 색은 currentColor 다 — 래퍼의 text-* 가 정한다 */}
          <Link href="/discover" aria-label="Open the map" className="shrink-0 transition-opacity active:opacity-70">
            <svg
              viewBox={KOREA_VIEWBOX}
              width={MAP_WIDTH}
              className="h-auto text-gray-400"
              role="img"
              aria-label="Map of South Korea with the regions fans visit most"
            >
              <defs>
                {/* 후광만 번지게 한다. 심지까지 흐려지면 "여기"가 사라진다.
                    필터 영역을 넉넉히 잡지 않으면 번진 가장자리가 잘린다 */}
                <filter id={HALO_FILTER_ID} x="-75%" y="-75%" width="250%" height="250%">
                  <feGaussianBlur stdDeviation={HALO_BLUR} />
                </filter>
              </defs>

              <path d={KOREA_PATH_D} fill="currentColor" />

              {hotspots.map((h) => (
                <g key={h.sido}>
                  {/* 후광 — 장소 수를 크기로 말한다 */}
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.r}
                    fill={accentColor}
                    opacity={haloOpacity(h.r)}
                    filter={`url(#${HALO_FILTER_ID})`}
                  />
                  {/* 심지 — 크기가 고정이라 "여기에 있다"가 후광에 묻히지 않는다 */}
                  <circle cx={h.x} cy={h.y} r={HOTSPOT_CORE_R} fill={accentColor} />
                </g>
              ))}
            </svg>
          </Link>
        </div>

        {/* 음수 마진으로 카드 패딩을 상쇄한다 — 스크롤 끝이 카드 가장자리까지 간다.
            여백은 스크롤 영역 안쪽으로 옮긴다. 바깥에 두면 칩과 그림자가 잘린다.

            세로 여백은 그림자가 뻗는 길이보다 커야 한다. overflow-x: auto 는 세로도
            같이 잘라내서, 여백이 모자라면 칩 아래 그림자가 직선으로 끊긴다.
            그림자가 아래로 2+10=12px 뻗으므로 12px 을 준다.
            바깥의 음수 마진이 그만큼 되돌려 칩 간격은 그대로다 */}
        <div className="-mx-4 -my-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 py-3">
            {topRegions.map((r) => (
              <RegionChip key={r.key} href={r.href} label={r.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
