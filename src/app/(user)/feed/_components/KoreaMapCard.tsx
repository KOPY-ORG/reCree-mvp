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

const HALO_FILTER_ID = "korea-hotspot-bloom";
const HOTSPOT_GRADIENT_ID = "korea-hotspot-fill";

/**
 * 카드의 두 모습. 값을 한자리에 모아 두는 것은 이것들이 따로 놀 수 없기 때문이다 —
 * 육지를 물리면 핀이 묻히고, 핀을 키우면 번짐도 같이 커져야 덩어리로 보이지 않는다.
 * 호출부가 네댓 개를 따로 넘기면 그중 하나만 바뀐 조합이 언제든 생긴다.
 *
 * topic 쪽이 연한 육지에 크고 옅은 번짐인 이유는 토픽 색이 연할 수 있어서다
 * (NCT WISH #7AAED5, SVT #A3BADC). 색을 진하게 보정하지는 않는다 —
 * 색은 토픽의 고유 속성이라 여기서 손댈 것이 아니고, 대신 배경을 물리고
 * 번지는 면적으로 읽히게 한다.
 */
const VARIANTS = {
  brand: {
    landClass: "text-gray-400",
    haloScale: 1,
    coreScale: 1,
    blur: 2.4,
    opacityMin: 0.45,
    opacityMax: 0.7,
    showChips: true,
  },
  topic: {
    landClass: "text-gray-200",
    /* 심지와 후광을 같은 배율로 키운다 — 비율이 어긋나면 심지가 번짐을 먹어
       가장자리가 선으로 보이거나, 반대로 심지가 후광에 묻혀 자리를 잃는다 */
    haloScale: 1.8,
    coreScale: 1.8,
    /** 2.4 에서는 가장자리가 선으로 보인다. 이 값부터 경계가 사라진다 */
    blur: 6,
    opacityMin: 0.22,
    opacityMax: 0.4,
    showChips: false,
  },
} as const;

export type MapCardVariant = keyof typeof VARIANTS;

/**
 * CSS 그라데이션 방향(DB 의 Topic.gradientDir)을 SVG linearGradient 좌표로 옮긴다.
 * 같은 값이 배지에서는 CSS 로, 여기서는 SVG 로 쓰이므로 표기만 바뀌고 방향은 같다.
 */
const GRADIENT_VECTOR: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
  "to bottom": { x1: 0, y1: 0, x2: 0, y2: 1 },
  "to top": { x1: 0, y1: 1, x2: 0, y2: 0 },
  "to right": { x1: 0, y1: 0, x2: 1, y2: 0 },
  "to left": { x1: 1, y1: 0, x2: 0, y2: 0 },
  "to bottom right": { x1: 0, y1: 0, x2: 1, y2: 1 },
  "to bottom left": { x1: 1, y1: 0, x2: 0, y2: 1 },
  "to top right": { x1: 0, y1: 1, x2: 1, y2: 0 },
  "to top left": { x1: 1, y1: 1, x2: 0, y2: 0 },
};

/**
 * 반지름을 그대로 불투명도로 옮긴다. 장소 수를 로그로 누른 결과가 반지름이므로
 * 여기서 다시 count 를 보면 두 축이 서로 다른 곡선을 타게 된다.
 *
 * 받는 r 은 배율을 걸기 전 값이다. 키웠다고 더 진해지면 크기와 진하기가 같은 말을
 * 두 번 하게 되고, 작은 시도가 큰 시도보다 옅어 보이는 순서도 깨진다.
 */
function haloOpacity(r: number, min: number, max: number): number {
  const t = (r - HOTSPOT_MIN_R) / (HOTSPOT_MAX_R - HOTSPOT_MIN_R);
  return min + (max - min) * t;
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
  variant = "brand",
  accentColor,
  accentColor2 = null,
  accentGradientDir = "to bottom",
  accentGradientStop = 100,
  eyebrow,
  title = "Where fans are going",
  subtitle = "Tap the map to explore spots around Korea",
  discoverHref = "/discover",
}: {
  counts: SidoPlaceCount[];
  maxCount: number;
  /** 카드의 모습 한 벌 — 육지 진하기 · 핀 크기 · 번짐 · 지역 칩 (VARIANTS) */
  variant?: MapCardVariant;
  /** 핫스팟 색. Hot 탭은 브랜드색, 토픽 탭은 토픽색을 넘긴다 */
  accentColor: string;
  /** 토픽 색이 그라데이션일 때의 끝 색. null 이면 단색으로 칠한다 */
  accentColor2?: string | null;
  /** Topic.gradientDir 그대로. accentColor2 가 없으면 쓰이지 않는다 */
  accentGradientDir?: string;
  /** Topic.gradientStop 그대로 (%). 100 을 넘는 값은 끝에서 자른다 */
  accentGradientStop?: number;
  /** 제목 위 작은 줄. 토픽 탭만 쓴다 — "BTS ON THE MAP" */
  eyebrow?: string;
  title?: string;
  /** null 이면 줄을 내지 않는다 */
  subtitle?: string | null;
  /** 카드를 눌렀을 때 가는 곳. 토픽 탭은 그 토픽을 필터로 걸고 간다 */
  discoverHref?: string;
}) {
  const v = VARIANTS[variant];
  // counts 는 이미 count desc 다 (area-queries.ts:76).
  // 장소가 0곳인 시도는 애초에 counts 에 없다 — Gwangju 가 그 경우다 (area-queries.ts:9-12)
  const hotspots = counts.slice(0, HOTSPOT_COUNT).map((c) => {
    const pin = SIDO_PIN[c.sido];
    const { x, y } = projectKorea(pin.lon, pin.lat);
    const baseR = hotspotRadius(c.count, maxCount);
    return {
      sido: c.sido,
      x,
      y,
      r: baseR * v.haloScale,
      opacity: haloOpacity(baseR, v.opacityMin, v.opacityMax),
    };
  });
  const coreR = HOTSPOT_CORE_R * v.coreScale;

  const topRegions = counts.slice(0, CHIP_REGION_COUNT).map((c) => ({
    key: c.sido,
    label: c.areaNameEn,
    href: buildDiscoverHref({ region: regionParam(c.areaNameEn) }),
  }));

  // 끝 색이 있을 때만 그라데이션을 건다. 단색을 그라데이션으로 감싸면
  // 같은 색 두 정지점이 되어 defs 만 늘고 그림은 같다
  const vector = GRADIENT_VECTOR[accentGradientDir] ?? GRADIENT_VECTOR["to bottom"];
  const fill = accentColor2 ? `url(#${HOTSPOT_GRADIENT_ID})` : accentColor;

  return (
    <section className="px-4 mb-6">
      <div className="rounded-[20px] bg-card border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <Link href={discoverHref} className="flex flex-col gap-1.5 transition-opacity active:opacity-70">
              {/* 토픽 이름은 제목이 아니라 그 위에 얹는다. 제목 자리에 넣으면
                  "BTS on the map"과 장소 수가 20px 을 두고 겨뤄 둘 다 작아진다 */}
              {eyebrow && (
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {eyebrow}
                </span>
              )}
              {/* 20px 은 시안 값이다. 375px 에서 지도 160px 을 빼면 글자 기둥이 120px 뿐이라
                  한 단계만 키워도 "Where / fans are / going" 3줄로 깨진다 */}
              <span className="text-[20px] font-bold leading-[1.2]">{title}</span>
              {subtitle && (
                <span className="text-[13px] leading-[1.4] text-muted-foreground">{subtitle}</span>
              )}
            </Link>

            <Link
              href={discoverHref}
              className="mt-1 self-start inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-full bg-foreground text-background text-[14px] font-semibold transition-opacity active:opacity-70"
            >
              <FoldedMapIcon size={15} />
              Open map
            </Link>
          </div>

          {/* 육지 색은 currentColor 다 — 래퍼의 text-* 가 정한다 */}
          <Link href={discoverHref} aria-label="Open the map" className="shrink-0 transition-opacity active:opacity-70">
            <svg
              viewBox={KOREA_VIEWBOX}
              width={MAP_WIDTH}
              className={`h-auto ${v.landClass}`}
              role="img"
              aria-label="Map of South Korea with the regions fans visit most"
            >
              <defs>
                {/* 후광만 번지게 한다. 심지까지 흐려지면 "여기"가 사라진다.
                    필터 영역을 넉넉히 잡지 않으면 번진 가장자리가 잘린다 */}
                <filter id={HALO_FILTER_ID} x="-75%" y="-75%" width="250%" height="250%">
                  <feGaussianBlur stdDeviation={v.blur} />
                </filter>

                {/* 좌표가 objectBoundingBox 라 핀마다 제 크기에 맞춰 칠해진다 —
                    큰 핀만 그라데이션이 다 보이고 작은 핀은 잘리는 일이 없다 */}
                {accentColor2 && (
                  <linearGradient id={HOTSPOT_GRADIENT_ID} x1={vector.x1} y1={vector.y1} x2={vector.x2} y2={vector.y2}>
                    <stop offset="0" stopColor={accentColor} />
                    <stop offset={Math.min(accentGradientStop, 100) / 100} stopColor={accentColor2} />
                  </linearGradient>
                )}
              </defs>

              <path d={KOREA_PATH_D} fill="currentColor" />

              {hotspots.map((h) => (
                <g key={h.sido}>
                  {/* 후광 — 장소 수를 크기로 말한다 */}
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.r}
                    fill={fill}
                    opacity={h.opacity}
                    filter={`url(#${HALO_FILTER_ID})`}
                  />
                  {/* 심지 — 시도마다 크기가 같아 "여기에 있다"가 후광에 묻히지 않는다 */}
                  <circle cx={h.x} cy={h.y} r={coreR} fill={fill} />
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
        {v.showChips && (
          <div className="-mx-4 -my-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-4 py-3">
              {topRegions.map((r) => (
                <RegionChip key={r.key} href={r.href} label={r.label} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
