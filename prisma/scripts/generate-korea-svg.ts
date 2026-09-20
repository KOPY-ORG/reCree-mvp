// 한반도 윤곽 SVG 생성 — public/korea.svg
//
// 실행:
//   dry-run (기본, 파일을 쓰지 않는다):
//     npx tsx prisma/scripts/generate-korea-svg.ts
//   실제 기록:
//     npx tsx prisma/scripts/generate-korea-svg.ts --write
//
// ── 설계 ──────────────────────────────────────────────────────────────────────
//
// 1. 출처는 Natural Earth 10m admin-1 (퍼블릭 도메인 — 출처 표기 의무 없음).
//    KOSTAT/GADM 계열은 라이선스가 비상업이거나 불명확해 상업 서비스에 못 쓴다.
//
// 2. 남한만. iso_a2 = KR 인 17개 시도만 남기고 북한은 받지 않는다.
//
// 3. 투영은 src/lib/korea-projection.ts 를 그대로 쓴다. 런타임 핫스팟도 같은 함수를
//    쓰므로 여기서만 다른 도법을 쓰면 핀이 윤곽에서 어긋난다.
//
// 4. 단순화는 투영 **후** SVG 단위에서 한다. 위경도에서 깎으면 위도에 따라
//    실제로 깎이는 양이 달라진다. 허용 오차도 화면 단위로 말할 수 있다.
//
// 5. 시도 경계선은 그리지 않는다. 카드가 말하는 것은 "어디에 몰려 있나"이지
//    행정 구역이 아니다. 17개 폴리곤을 합쳐 단일 <path> 하나로 낸다.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { KOREA_VIEWBOX, projectKorea, KM_PER_UNIT } from "../../src/lib/korea-projection";

const WRITE = process.argv.includes("--write");

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

const OUT_PATH = resolve(process.cwd(), "public/korea.svg");

/** 단순화 허용 오차 (SVG 단위). 1 단위 ≈ 2.6km 라 0.4 는 약 1km 다 */
const SIMPLIFY_EPS = 0.4;

/** 이보다 작은 섬은 버린다 (SVG 단위²). 울릉도는 약 10 단위² 라 남는다 */
const MIN_RING_AREA = 0.5;

/**
 * 독도. Natural Earth 10m admin-1 의 한국 폴리곤은 동쪽 끝이 울릉도(130.92°E)에서
 * 끊겨 독도가 들어 있지 않다(실측). 원본에 없는 것을 **보충**하는 것이라
 * 다른 해안선과 달리 실제 형상이 아니라 점 하나로 찍는다.
 * 실면적 0.19km² 는 이 축척에서 0.03 단위²라 어차피 보이지 않는다.
 */
const DOKDO = { lon: 131.87, lat: 37.24, r: 1.2 };

type Pt = { x: number; y: number };

// ─── Ramer–Douglas–Peucker ───────────────────────────────────────────────────
// 의존성을 늘리지 않으려고 직접 쓴다. korea-projection 을 런타임이 import 하는데
// 런타임 의존성 추가가 금지라, 스크립트만 라이브러리를 쓰면 "같은 투영" 이 깨진다.

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + clamped * dx), p.y - (a.y + clamped * dy));
}

function rdp(points: Pt[], eps: number): Pt[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist <= eps) return [points[0], points[points.length - 1]];
  const left = rdp(points.slice(0, index + 1), eps);
  const right = rdp(points.slice(index), eps);
  return [...left.slice(0, -1), ...right];
}

/** 신발끈 공식. 방향은 상관없어 절댓값만 본다 */
function ringArea(points: Pt[]): number {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j].x + points[i].x) * (points[j].y - points[i].y);
  }
  return Math.abs(sum / 2);
}

// ─── GeoJSON ─────────────────────────────────────────────────────────────────

type Ring = [number, number][];
type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };
type Feature = { properties: Record<string, unknown>; geometry: Geometry };

function ringsOf(geometry: Geometry): Ring[] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
}

const n2 = (n: number) => Math.round(n * 100) / 100;

function ringToPath(points: Pt[]): string {
  const head = `M${n2(points[0].x)} ${n2(points[0].y)}`;
  const rest = points.slice(1).map((p) => `L${n2(p.x)} ${n2(p.y)}`).join("");
  return `${head}${rest}Z`;
}

/** 원을 호 두 개로. 단일 <path> 안에 넣어야 해서 <circle> 을 쓸 수 없다 */
function circleToPath(cx: number, cy: number, r: number): string {
  const l = n2(cx - r);
  const d = n2(r * 2);
  return `M${l} ${n2(cy)}a${n2(r)} ${n2(r)} 0 1 0 ${d} 0a${n2(r)} ${n2(r)} 0 1 0 -${d} 0Z`;
}

async function main() {
  console.log(`대상 ${WRITE ? "기록" : "dry-run (파일을 쓰지 않는다)"}`);
  console.log(`출처 ${SOURCE_URL}\n`);

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`내려받기 실패 ${res.status}`);
  const raw = await res.text();
  console.log(`내려받음 ${(raw.length / 1024 / 1024).toFixed(1)}MB`);

  const all = JSON.parse(raw).features as Feature[];
  const kr = all.filter(
    (f) => f.properties.iso_a2 === "KR" || f.properties.admin === "South Korea",
  );
  console.log(`전체 ${all.length} feature → 한국 ${kr.length}개`);
  console.log(`  ${kr.map((f) => f.properties.name).sort().join(", ")}\n`);
  if (kr.length !== 17) throw new Error(`시도가 17개가 아니다: ${kr.length}`);

  let ringsIn = 0, ptsIn = 0, ringsKept = 0, ptsOut = 0, dropped = 0;
  const paths: string[] = [];

  for (const f of kr) {
    for (const ring of ringsOf(f.geometry)) {
      ringsIn++;
      ptsIn += ring.length;
      const projected = ring.map(([lon, lat]) => projectKorea(lon, lat));
      const simplified = rdp(projected, SIMPLIFY_EPS);
      if (simplified.length < 4 || ringArea(simplified) < MIN_RING_AREA) { dropped++; continue; }
      ringsKept++;
      ptsOut += simplified.length;
      paths.push(ringToPath(simplified));
    }
  }

  const dokdo = projectKorea(DOKDO.lon, DOKDO.lat);
  paths.push(circleToPath(dokdo.x, dokdo.y, DOKDO.r));
  console.log(`독도 보충 → (${n2(dokdo.x)}, ${n2(dokdo.y)}) r=${DOKDO.r}`);

  console.log(`\n링 ${ringsIn} → ${ringsKept} (작은 섬 ${dropped}개 버림)`);
  console.log(`점 ${ptsIn.toLocaleString()} → ${ptsOut.toLocaleString()} (${((1 - ptsOut / ptsIn) * 100).toFixed(1)}% 감소)`);
  console.log(`허용 오차 ${SIMPLIFY_EPS} 단위 ≈ ${(SIMPLIFY_EPS * KM_PER_UNIT).toFixed(2)}km`);

  // 색을 박지 않는다. fill="currentColor" 로 두면 쓰는 쪽이 토큰으로 정한다
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KOREA_VIEWBOX}" fill="currentColor">` +
    `<path d="${paths.join("")}"/>` +
    `</svg>\n`;

  console.log(`\nviewBox ${KOREA_VIEWBOX} (1 단위 ≈ ${KM_PER_UNIT.toFixed(2)}km)`);
  console.log(`SVG ${(svg.length / 1024).toFixed(1)}KB`);

  if (!WRITE) {
    console.log(`\ndry-run 이라 쓰지 않았다. 기록하려면 --write`);
    return;
  }
  writeFileSync(OUT_PATH, svg, "utf8");
  console.log(`\n✔ ${OUT_PATH}`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
