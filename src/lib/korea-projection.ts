// 한반도 카드의 투영 — 생성 스크립트와 런타임이 **같은 함수**를 쓴다.
//
// 윤곽 SVG(public/korea.svg)는 prisma/scripts/generate-korea-svg.ts 가 이 파일의
// projectKorea 로 만든다. 핫스팟도 같은 함수로 찍어야 윤곽 위 제자리에 앉는다.
// 둘 중 하나만 바꾸면 핀이 바다로 나간다 — 상수를 고치면 SVG 를 다시 생성할 것.
//
// 지도 라이브러리를 쓰지 않는다(명세 3.2). d3-geo 는 런타임 의존성이 되어 금지이므로
// cos(lat0) 보정 정거원통도법을 직접 쓴다. 경도 폭 7.5°, 위도 폭 5.7° 규모에서는
// 정식 도법과의 차이가 카드 크기(수백 px)에서 눈에 띄지 않는다.

/** 투영 경계. 동쪽 끝은 독도(131.87°E)가 들어가도록 잡았다 */
export const KOREA_BOUNDS = {
  minLon: 124.5,
  maxLon: 132.0,
  minLat: 33.0,
  maxLat: 38.7,
} as const;

/** 위도에 따라 좁아지는 경도 간격을 보정하는 기준 위도 (경계의 한가운데) */
const LAT0 = (KOREA_BOUNDS.minLat + KOREA_BOUNDS.maxLat) / 2;
const COS_LAT0 = Math.cos((LAT0 * Math.PI) / 180);

/** 위도 1° 가 SVG 몇 단위인지. 세로를 먼저 정하고 가로를 따라오게 한다 */
export const VIEW_HEIGHT = 240;
const SCALE = VIEW_HEIGHT / (KOREA_BOUNDS.maxLat - KOREA_BOUNDS.minLat);

const round2 = (n: number) => Math.round(n * 100) / 100;

export const VIEW_WIDTH = round2(
  (KOREA_BOUNDS.maxLon - KOREA_BOUNDS.minLon) * COS_LAT0 * SCALE,
);

/** <svg viewBox> 에 그대로 넣는 문자열 */
export const KOREA_VIEWBOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

/** 위경도 → SVG 좌표. y 는 위가 북쪽이라 뒤집는다 */
export function projectKorea(lon: number, lat: number): { x: number; y: number } {
  return {
    x: (lon - KOREA_BOUNDS.minLon) * COS_LAT0 * SCALE,
    y: (KOREA_BOUNDS.maxLat - lat) * SCALE,
  };
}

/** SVG 한 단위가 몇 km 인지 — 핀 간격을 실제 거리로 가늠할 때 쓴다 */
export const KM_PER_UNIT = 111.32 / SCALE;

// ─── 시도 핀 ─────────────────────────────────────────────────────────────────

/** 경계 데이터(Natural Earth 10m admin-1)의 시도 이름. 17개 */
export type SidoKey =
  | "Seoul" | "Busan" | "Daegu" | "Incheon" | "Gwangju" | "Daejeon" | "Ulsan"
  | "Sejong" | "Gyeonggi" | "Gangwon"
  | "North Chungcheong" | "South Chungcheong"
  | "North Jeolla" | "South Jeolla"
  | "North Gyeongsang" | "South Gyeongsang" | "Jeju";

/**
 * 핫스팟을 찍을 자리. **장소 좌표의 평균을 쓰지 않는다.**
 * 경기도는 서울을 도넛처럼 둘러싸고 있어 평균이 구멍 한가운데(=서울 시내)로 들어온다 —
 * 실측에서 경기 평균이 서울 평균과 1.4km 거리였다. 장소가 늘어도 안 풀리는 구조다.
 *
 * 그래서 "그 시도에서 장소가 몰린 곳 부근"을 손으로 고정한다. 행정 중심지일 필요는 없다
 * (경북은 도청이 있는 안동보다 장소가 몰리는 쪽, 강원은 강릉).
 * 수도권 셋은 투영 후 거리를 보고 벌렸다 — 경기는 서울 남서쪽 수원·화성 방면으로 내렸다.
 */
export const SIDO_PIN: Record<SidoKey, { lat: number; lon: number }> = {
  Seoul:                { lat: 37.57, lon: 126.98 },
  Incheon:              { lat: 37.33, lon: 126.45 },
  Gyeonggi:             { lat: 37.04, lon: 126.90 },
  Gangwon:              { lat: 37.76, lon: 128.88 },
  "North Chungcheong":  { lat: 36.78, lon: 127.72 },
  "South Chungcheong":  { lat: 36.60, lon: 126.76 },
  Sejong:               { lat: 36.58, lon: 127.22 },
  Daejeon:              { lat: 36.30, lon: 127.45 },
  "North Jeolla":       { lat: 35.78, lon: 127.14 },
  Gwangju:              { lat: 35.16, lon: 126.85 },
  "South Jeolla":       { lat: 34.78, lon: 126.62 },
  "North Gyeongsang":   { lat: 36.30, lon: 128.72 },
  Daegu:                { lat: 35.87, lon: 128.60 },
  "South Gyeongsang":   { lat: 35.25, lon: 128.25 },
  Busan:                { lat: 35.16, lon: 129.08 },
  Ulsan:                { lat: 35.56, lon: 129.32 },
  Jeju:                 { lat: 33.42, lon: 126.56 },
};

export const SIDO_KEYS = Object.keys(SIDO_PIN) as SidoKey[];

// ─── 핫스팟 크기 ─────────────────────────────────────────────────────────────

/** 심지. 장소 수와 무관하게 고정이라 "여기에 있다"가 크기에 묻히지 않는다 */
export const HOTSPOT_CORE_R = 4;

export const HOTSPOT_MIN_R = 6;
export const HOTSPOT_MAX_R = 15;

/**
 * 후광 반지름. 선형이면 서울 112곳 대 대구 1곳에서 작은 시도가 점으로 사라진다 —
 * 실측 비가 112:1 이라 로그로 눌러 최소 6 · 최대 15 사이에 담는다.
 *
 * 이 범위는 카드가 시도 전부를 찍지 않는다는 전제 위에 있다 (KoreaMapCard 의 상위 N).
 * 17개를 다 찍으면 수도권 셋이 이 크기에서 한 덩어리로 뭉친다.
 *
 * 이 상수는 런타임 핫스팟만 정한다. 윤곽 SVG 생성에는 쓰이지 않으므로
 * 바꿔도 public/korea.svg · korea-path.ts 를 다시 낼 필요가 없다.
 */
export function hotspotRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  if (maxCount <= 0) return HOTSPOT_MIN_R;
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  const r = HOTSPOT_MIN_R + (HOTSPOT_MAX_R - HOTSPOT_MIN_R) * ratio;
  return Math.min(HOTSPOT_MAX_R, Math.max(HOTSPOT_MIN_R, r));
}
