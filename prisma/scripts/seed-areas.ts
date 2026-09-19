// Area 전량 재등록 — ldongCode2(한국관광공사) 기준 시도·시군구
//
// 실행:
//   dry-run (기본, 쓰지 않는다):
//     npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/seed-areas.ts
//   실제 실행:
//     AREA_RESET_YES=1 npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/seed-areas.ts --execute
//     → 그 뒤 콘솔에서 "yes" 를 입력해야 시작한다
//
// ⚠️ 기본 대상은 .env.local 의 DATABASE_URL — dev 다. dry-run 은 아무것도 쓰지 않는다.
//    prod 를 볼 때는 그 실행에만 DATABASE_URL 을 주입한다. dry-run 은 읽기 전용 URL 로 되고,
//    --execute 는 쓰기 권한이 있는 관리자 URL 이라야 한다.
//    시작할 때 host 와 Supabase ref 를 찍으니 대상을 확인하고 진행한다.
// ⚠️ Area 를 전부 지운다. Place.areaId 는 FK 가 SET NULL 이라 조용히 끊어지므로
//    삭제 전에 스냅샷 JSON 을 남긴다 (SNAPSHOT_DIR).
//
// ── 설계 ──────────────────────────────────────────────────────────────────────
//
// 1. ldongCode2 를 lDongListYn=Y 로 국문·영문 각 1회 호출한다. 269행씩 온다.
//    269행 = 시군구 230 + 일반시의 구 39. 시도 행은 따로 오지 않아 regn 코드로 묶어 만든다.
//
// 2. 일반시 13곳은 구를 별도 Area 로 만들지 않고 상위 시의 lDongSignguCds 에 흡수한다.
//    축제 데이터가 시 코드에 안 붙어 있기 때문이다 — 수원시(110) 0건, 구 4개 16건.
//
// 3. 동네(홍대·명동)는 만들지 않는다. 계층은 시도(level 0) → 시군구(level 1) 둘뿐이다.
//
// 4. Place 는 이름이 아니라 좌표로 붙인다. 주소는 형식이 섞여 있어(영문 Google 주소 66행,
//    약칭·역순 표기 다수) 시군구까지 확정되는 비율이 54% 에 그친다. 좌표는 197행 전부 있다.
//
// 5. 광주·전남은 TourAPI 가 12 로 통합했는데 카카오 법정동도 이미 12 를 준다
//    (순천 1215013200 · 광주 북구 1230010700 실측). 별도 분기 없이 일반 경로가 먹는다.
//
// 6. 시도의 nameEn 은 아래 SIDO_NAME_EN 고정표에서만 온다. slug(nameEn 소문자)가
//    CuratedSection.filterRegion, 외부 URL(?region=) 에 FK 없이 묶여 있어 바뀌면 조용히 깨진다.
//    기존 행에서 이름을 물려받는 방식은 lDongRegnCd 가 없는 DB(prod)에서 동작하지 않아
//    같은 스크립트가 DB 마다 다른 이름을 만들었다. 표를 코드에 두면 어디서 돌려도 같다.
//    표에 없는 regn 이 TourAPI 에서 오면 이름을 지어내지 않고 즉시 중단한다.

try {
  process.loadEnvFile(".env.local");
} catch {}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const EXECUTE = process.argv.includes("--execute");

// 공공데이터포털 활용신청 상세의 End Point 가 https 다
const KOR_BASE = "https://apis.data.go.kr/B551011/KorService2";
const ENG_BASE = "https://apis.data.go.kr/B551011/EngService2";
const KAKAO_COORD2REGION = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";

/** regn 과 signgu 가 같은 값으로 오는 유일한 시도. 시군구를 만들지 않는다 */
const SEJONG_REGN = "36110";
/** 카카오 법정동 코드의 세종 regn 2자리. TourAPI 의 36110 과 체계가 달라 따로 본다 */
const KAKAO_SEJONG_REGN = "36";

/**
 * lDongRegnCd → 시도 nameEn 고정표. slug 는 이 값의 소문자다.
 * 규칙: 특별시·광역시·특별자치시·통합특별시는 이름만, 도(특별자치도 포함)는 "-do" 를 붙인다.
 * 바꾸면 ?region= 링크가 끊긴다. TourAPI 영문명을 쓰지 않는 이유는 파일 머리 6번에 적었다.
 */
const SIDO_NAME_EN: Record<string, string> = {
  "11": "Seoul",
  "12": "Jeonnam-Gwangju",
  "26": "Busan",
  "27": "Daegu",
  "28": "Incheon",
  "30": "Daejeon",
  "31": "Ulsan",
  "36110": "Sejong",
  "41": "Gyeonggi-do",
  "43": "Chungcheongbuk-do",
  "44": "Chungcheongnam-do",
  "47": "Gyeongsangbuk-do",
  "48": "Gyeongsangnam-do",
  "50": "Jeju-do",
  "51": "Gangwon-do",
  "52": "Jeonbuk-do",
};

/** 카카오가 서비스 영역 밖이라고 답한 좌표. 실패로 세되 중단하지 않는다 */
const REASON_OVERSEAS = "해외(카카오 서비스 영역 밖)";

/** 카카오 호출 간 지연. 순차 호출이라 초당 8건 정도가 된다 */
const KAKAO_DELAY_MS = 120;

/** 삭제 전 스냅샷. .gitignore 에 올라 있다 */
const SNAPSHOT_DIR = path.join("prisma", "scripts", "backups");

/** 삭제 → 삽입 → 연결을 한 트랜잭션으로 묶는다. Place 업데이트가 시군구 수만큼 돈다 */
const TX_TIMEOUT_MS = 120_000;
const TX_MAX_WAIT_MS = 20_000;

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type LdongRow = {
  lDongRegnCd: string;
  lDongRegnNm: string;
  lDongSignguCd: string;
  lDongSignguNm: string;
};

type LdongResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: LdongRow[] | LdongRow } };
  };
  resultCode?: string;
  resultMsg?: string;
};

type KakaoDoc = {
  region_type?: string;
  code?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

type KakaoResponse = {
  documents?: KakaoDoc[];
  errorType?: string;
  message?: string;
  // 서비스 영역 밖일 때만 오는 본문 — HTTP 400 {"code":-2,"msg":"...not in the service area"}
  code?: number;
  msg?: string;
};

/** 카카오 조회 1건의 결과. 해외는 에러가 아니라 결과의 한 종류다 */
type KakaoLookup =
  | { kind: "found"; doc: KakaoDoc }
  /** 법정동(B) 결과가 비어 온다 — 바다 등 */
  | { kind: "none" }
  /** 카카오가 국내가 아니라고 답했다 */
  | { kind: "outOfService" };

type TargetSido = {
  id: string;
  regnCd: string;
  nameKo: string;
  nameEn: string;
  sortOrder: number;
};

type TargetSigngu = {
  id: string;
  regnCd: string;
  signguCd: string;
  nameKo: string;
  nameEn: string;
  signguCds: string[];
  sortOrder: number;
};

type PlaceRow = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressKo: string | null;
  latitude: number | null;
  longitude: number | null;
  areaId: string | null;
  area: { nameKo: string; nameEn: string | null; level: number } | null;
};

type Resolution =
  | { kind: "code"; areaId: string; areaLabel: string; kakao: string }
  | { kind: "fallback"; areaId: string; areaLabel: string; kakao: string }
  | { kind: "failed"; reason: string; kakao: string };

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function parseDbTarget(url: string): { host: string; ref: string } {
  try {
    const u = new URL(url);
    return { host: u.host, ref: u.username.replace(/^postgres\./, "") };
  } catch {
    return { host: "(parse error)", ref: "(parse error)" };
  }
}

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 이름 비교용. 공백을 지워 "수원시 팔달구" 와 "수원시팔달구" 를 같게 본다 */
function normalizeName(s: string): string {
  return s.replace(/\s+/g, "");
}

// ─── ldongCode2 ───────────────────────────────────────────────────────────────

async function fetchLdong(base: string, label: string): Promise<LdongRow[]> {
  const url = new URL(`${base}/ldongCode2`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY ?? "");
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "recree-seed-areas");
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("lDongListYn", "Y");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  const text = await res.text();

  let data: LdongResponse;
  try {
    data = JSON.parse(text) as LdongResponse;
  } catch {
    throw new Error(`${label} JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
  const header = data.response?.header;
  if (header?.resultCode !== "0000") {
    throw new Error(
      `${label} resultCode=${header?.resultCode ?? data.resultCode} (${header?.resultMsg ?? data.resultMsg})`,
    );
  }
  const rawItems = data.response?.body?.items?.item;
  const items: LdongRow[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  if (items.length === 0) throw new Error(`${label} 0행`);
  return items;
}

// ─── 목표 Area 계산 ───────────────────────────────────────────────────────────

/**
 * 시도 nameEn 은 SIDO_NAME_EN 에서만 온다 — DB 현재 값도, TourAPI 영문명도 보지 않는다.
 * 시군구 nameEn 은 TourAPI 영문명을 그대로 쓴다. 접미사를 떼면 Jung(중구)이 5개 시도에서
 * 겹치고 영어로 뜻이 없어진다.
 */
function buildTargets(
  ko: LdongRow[],
  en: LdongRow[],
): { sidos: TargetSido[]; signgus: TargetSigngu[]; absorbed: Map<string, string[]> } {
  const enByKey = new Map(en.map((r) => [`${r.lDongRegnCd}/${r.lDongSignguCd}`, r]));
  const missingEn = ko.filter((r) => !enByKey.has(`${r.lDongRegnCd}/${r.lDongSignguCd}`));
  if (missingEn.length > 0) {
    throw new Error(
      `영문에 없는 코드쌍 ${missingEn.length}건: ${missingEn.slice(0, 5).map((r) => `${r.lDongRegnCd}/${r.lDongSignguCd}`).join(", ")}`,
    );
  }

  // 공백이 있으면 일반시의 구 ("수원시 장안구"). 광역시의 구는 공백이 없다 ("해운대구")
  const isGu = (r: LdongRow) => r.lDongSignguNm.includes(" ");

  // 구 → 상위 시. 공백 앞을 떼어 같은 regn 안에서 이름이 정확히 일치하는 행을 찾는다
  const absorbed = new Map<string, string[]>(); // "regn/signgu"(상위 시) → 구 코드들
  const orphanGu: LdongRow[] = [];
  for (const g of ko.filter(isGu)) {
    const head = g.lDongSignguNm.split(" ")[0];
    const parent = ko.find((r) => r.lDongRegnCd === g.lDongRegnCd && r.lDongSignguNm === head);
    if (!parent) {
      orphanGu.push(g);
      continue;
    }
    const key = `${parent.lDongRegnCd}/${parent.lDongSignguCd}`;
    absorbed.set(key, [...(absorbed.get(key) ?? []), g.lDongSignguCd]);
  }
  if (orphanGu.length > 0) {
    throw new Error(`상위 시를 못 찾은 구 ${orphanGu.length}건: ${orphanGu.map((g) => g.lDongSignguNm).join(", ")}`);
  }

  // 시도 — regn 코드로 묶는다
  const sidoSeen = new Set<string>();
  const sidos: TargetSido[] = [];
  for (const r of ko) {
    if (sidoSeen.has(r.lDongRegnCd)) continue;
    sidoSeen.add(r.lDongRegnCd);
    const nameEn = SIDO_NAME_EN[r.lDongRegnCd];
    if (!nameEn) {
      throw new Error(
        `SIDO_NAME_EN 에 없는 시도 regn=${r.lDongRegnCd} "${r.lDongRegnNm}".\n` +
          "   이름을 지어내면 ?region= slug 가 DB 마다 갈린다. 표에 직접 추가해야 한다.",
      );
    }
    sidos.push({
      id: randomUUID(),
      regnCd: r.lDongRegnCd,
      nameKo: r.lDongRegnNm,
      nameEn,
      sortOrder: sidos.length,
    });
  }

  // 시군구 — 구 39개와 세종 중복 1개를 뺀다
  const guKeys = new Set(ko.filter(isGu).map((r) => `${r.lDongRegnCd}/${r.lDongSignguCd}`));
  const signgus: TargetSigngu[] = [];
  for (const r of ko) {
    const key = `${r.lDongRegnCd}/${r.lDongSignguCd}`;
    if (guKeys.has(key)) continue;
    if (r.lDongRegnCd === SEJONG_REGN) continue; // 시도로만 만든다
    const enRow = enByKey.get(key);
    if (!enRow) throw new Error(`${r.lDongSignguNm} 영문 행 없음`);
    const absorbedCds = absorbed.get(key);
    signgus.push({
      id: randomUUID(),
      regnCd: r.lDongRegnCd,
      signguCd: r.lDongSignguCd,
      nameKo: r.lDongSignguNm,
      nameEn: enRow.lDongSignguNm,
      // 일반시는 자기 코드를 넣지 않는다 — 축제가 0건이라 넣으면 헛호출이다
      signguCds: absorbedCds ?? [r.lDongSignguCd],
      sortOrder: signgus.length,
    });
  }

  return { sidos, signgus, absorbed };
}

// ─── 카카오 역지오코딩 ────────────────────────────────────────────────────────

/**
 * 키·권한 문제는 즉시 던진다 — 197번 반복해 확인할 이유가 없다.
 * 서비스 영역 밖(code -2)만 예외다. 해외 장소 한 곳 때문에 전체가 멈추면 안 된다.
 */
async function coord2region(lat: number, lng: number): Promise<KakaoLookup> {
  const url = new URL(KAKAO_COORD2REGION);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY ?? ""}` },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();

  let data: KakaoResponse | null = null;
  try {
    data = JSON.parse(text) as KakaoResponse;
  } catch {
    // 본문이 JSON 이 아니다. 아래에서 원문 앞부분을 그대로 쓴다
  }

  if (!res.ok) {
    // 국내 좌표가 아니다. 403·5xx 등 나머지는 그대로 던진다
    if (data?.code === -2) return { kind: "outOfService" };
    const detail = `${data?.errorType ?? ""} ${data?.message ?? ""}`.trim() || text.slice(0, 200);
    throw new Error(`카카오 HTTP ${res.status} — ${detail}`);
  }
  if (data === null) throw new Error(`카카오 JSON 파싱 실패: ${text.slice(0, 200)}`);

  // 법정동(B). 바다면 documents 가 비어 온다 — 에러가 아니라 "없음" 이다
  const doc = (data.documents ?? []).find((d) => d.region_type === "B");
  return doc ? { kind: "found", doc } : { kind: "none" };
}

// ─── 좌표 → Area 매칭 ─────────────────────────────────────────────────────────

function matchArea(
  doc: KakaoDoc,
  sidos: TargetSido[],
  signgus: TargetSigngu[],
): Resolution {
  const code = doc.code ?? "";
  const name1 = doc.region_1depth_name ?? "";
  const name2 = doc.region_2depth_name ?? "";
  const kakao = `${code} ${name1} ${name2}`.trim();

  if (code.length < 5) return { kind: "failed", reason: "법정동 코드가 짧다", kakao };

  const kakaoRegn = code.slice(0, 2);
  const kakaoSigngu = code.slice(2, 5);

  // 세종 — 시군구가 없다. 시도 단독으로 붙인다
  if (kakaoRegn === KAKAO_SEJONG_REGN) {
    const sejong = sidos.find((s) => s.regnCd === SEJONG_REGN);
    if (!sejong) return { kind: "failed", reason: "세종 시도 행이 없다", kakao };
    return { kind: "code", areaId: sejong.id, areaLabel: `${sejong.nameKo} (시도)`, kakao };
  }

  // 일반 — regn 이 같고 lDongSignguCds 가 카카오 signgu 를 품은 행
  const inRegn = signgus.filter((s) => s.regnCd === kakaoRegn);
  const byCode = inRegn.find((s) => s.signguCds.includes(kakaoSigngu));
  if (byCode) return { kind: "code", areaId: byCode.id, areaLabel: byCode.nameKo, kakao };

  // 폴백 — 같은 시도 안에서 이름으로. "수원시 팔달구" 처럼 오면 앞 토큰으로도 본다
  const head = name2.split(" ")[0];
  const byName =
    inRegn.find((s) => normalizeName(s.nameKo) === normalizeName(name2)) ??
    inRegn.find((s) => normalizeName(s.nameKo) === normalizeName(head));
  if (byName) return { kind: "fallback", areaId: byName.id, areaLabel: byName.nameKo, kakao };

  if (inRegn.length === 0) return { kind: "failed", reason: `regn ${kakaoRegn} 에 시군구가 없다`, kakao };
  return { kind: "failed", reason: `signgu ${kakaoSigngu} · 이름 "${name2}" 둘 다 불일치`, kakao };
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function confirm(): Promise<void> {
  if (process.env.AREA_RESET_YES !== "1") {
    throw new Error("--execute 에는 AREA_RESET_YES=1 이 함께 필요하다");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await ask(rl, '\n⚠️  Area 를 전부 삭제하고 재등록한다. 계속하려면 "yes" 를 입력: ');
  rl.close();
  if (answer.trim() !== "yes") throw new Error(`취소됐다 (입력: "${answer.trim()}")`);
}

async function main() {
  if (!process.env.TOUR_API_KEY) throw new Error("TOUR_API_KEY 없음 (.env.local)");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 없음 (.env.local)");
  if (!process.env.KAKAO_REST_API_KEY) throw new Error("KAKAO_REST_API_KEY 없음 (.env.local)");

  const target = parseDbTarget(process.env.DATABASE_URL);
  console.log(`대상 DB host: ${target.host}`);
  console.log(`대상 Supabase 프로젝트: ${target.ref}`);
  console.log(EXECUTE ? "── EXECUTE — 실제로 지우고 쓴다 ──\n" : "── DRY RUN — 쓰지 않는다 ──\n");

  // ── 1. 현재 상태 읽기 ──────────────────────────────────────────────────────
  const existingAreas = await prisma.area.findMany({
    select: { id: true, nameKo: true, nameEn: true, level: true, lDongRegnCd: true },
  });
  const curatedSections = await prisma.curatedSection.findMany({
    select: { id: true, titleEn: true, filterRegion: true, isActive: true },
    orderBy: { order: "asc" },
  });
  const places: PlaceRow[] = await prisma.place.findMany({
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      addressKo: true,
      latitude: true,
      longitude: true,
      areaId: true,
      area: { select: { nameKo: true, nameEn: true, level: true } },
    },
    orderBy: { nameKo: "asc" },
  });
  console.log(`현재 Area ${existingAreas.length}행 · Place ${places.length}행 (areaId 있음 ${places.filter((p) => p.areaId).length})`);

  // ── 2. 목표 Area 계산 ──────────────────────────────────────────────────────
  console.log("\n▶ ldongCode2 (lDongListYn=Y) 국문·영문 각 1회 호출");
  const ko = await fetchLdong(KOR_BASE, "KorService2");
  const en = await fetchLdong(ENG_BASE, "EngService2");
  console.log(`  국문 ${ko.length}행 · 영문 ${en.length}행`);

  const { sidos, signgus, absorbed } = buildTargets(ko, en);
  console.log(`  → 시도 ${sidos.length} · 시군구 ${signgus.length} · 일반시 ${absorbed.size}곳이 구 ${ko.filter((r) => r.lDongSignguNm.includes(" ")).length}개 흡수`);

  console.log("\n【1. 생성될 Area】");
  console.log(`  level 0 (시도)    ${sidos.length}행`);
  console.log(`  level 1 (시군구)  ${signgus.length}행`);
  console.log(`  합계              ${sidos.length + signgus.length}행`);
  const multi = signgus.filter((s) => s.signguCds.length > 1);
  console.log(`\n  lDongSignguCds 가 여럿인 행 ${multi.length}곳:`);
  for (const s of multi) {
    const sido = sidos.find((x) => x.regnCd === s.regnCd);
    console.log(`    ${(sido?.nameKo ?? "?").padEnd(10)} ${s.nameKo.padEnd(8)} regn=${s.regnCd} [${s.signguCds.join(",")}]`);
  }

  console.log("\n【2. level 0 nameEn — 현재 대비】");
  const newSidoByRegn = new Map(sidos.map((s) => [s.regnCd, s]));
  const existingSidos = existingAreas.filter((x) => x.level === 0);
  let sameNameCount = 0;
  for (const a of existingSidos.sort((x, y) => (x.nameKo > y.nameKo ? 1 : -1))) {
    const next = a.lDongRegnCd ? newSidoByRegn.get(a.lDongRegnCd) : undefined;
    const oldSlug = (a.nameEn ?? "").toLowerCase();
    if (!next) {
      console.log(`    ✖ 사라짐   "${a.nameEn}" (slug "${oldSlug}") — ${a.nameKo}`);
      continue;
    }
    const newSlug = next.nameEn.toLowerCase();
    if (a.nameEn === next.nameEn) {
      sameNameCount++;
      continue;
    }
    console.log(`    ~ 바뀜     "${a.nameEn}" → "${next.nameEn}"  slug "${oldSlug}" → "${newSlug}"${oldSlug === newSlug ? "  (slug 동일)" : "  ⚠ slug 변경"}`);
  }
  console.log(`    현재와 이름이 같은 시도 ${sameNameCount}/${existingSidos.length}`);
  console.log(`    (새 시도 ${sidos.length}개의 nameEn 은 전부 SIDO_NAME_EN 고정표에서 온다)`);

  // ── level 0 slug 에 묶인 값 점검 ───────────────────────────────────────────
  console.log("\n【3. CuratedSection.filterRegion → 새 level 0 slug 매칭】");
  const newSidoSlugs = new Set(sidos.map((s) => s.nameEn.toLowerCase()));
  const withRegion = curatedSections.filter((s) => s.filterRegion);
  if (curatedSections.length === 0) console.log("  CuratedSection 없음");
  else if (withRegion.length === 0) console.log(`  filterRegion 이 설정된 섹션 없음 (전체 ${curatedSections.length}행)`);
  let unmatchedRegion = 0;
  for (const s of withRegion) {
    const region = s.filterRegion ?? "";
    // curation-queries 는 level 0 nameEn 과 대소문자 무시 비교한다
    const matched = newSidoSlugs.has(region.toLowerCase());
    if (!matched) unmatchedRegion++;
    console.log(
      `  ${matched ? "✔" : "⚠"} "${region}"${matched ? "" : "  — 매칭되는 level 0 없음"}  ` +
        `[${s.isActive ? "활성" : "비활성"}] ${s.titleEn}`,
    );
  }
  if (withRegion.length > 0) {
    console.log(`  매칭 ${withRegion.length - unmatchedRegion}/${withRegion.length}${unmatchedRegion > 0 ? `  ⚠ 깨지는 값 ${unmatchedRegion}개` : ""}`);
  }


  // ── 3. 좌표 해석 (트랜잭션 밖에서 전부 끝낸다) ────────────────────────────
  console.log(`\n▶ 카카오 coord2regioncode 순차 호출 (${places.filter((p) => p.latitude !== null && p.longitude !== null).length}건, 간격 ${KAKAO_DELAY_MS}ms)`);
  const resolutions = new Map<string, Resolution>();
  let done = 0;
  for (const p of places) {
    if (p.latitude === null || p.longitude === null) {
      resolutions.set(p.id, { kind: "failed", reason: "좌표 없음", kakao: "-" });
      continue;
    }
    let lookup: KakaoLookup;
    try {
      lookup = await coord2region(p.latitude, p.longitude);
    } catch (e) {
      // 키·권한 문제를 197번 반복해 확인할 이유가 없다. 원인을 붙여 즉시 중단한다
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `${msg}\n   (${done}건 처리 후 중단 · 장소 "${p.nameKo}" ${p.latitude},${p.longitude})\n` +
          "   403 NotAuthorizedError 라면 카카오 개발자 콘솔 > 내 애플리케이션 > 카카오맵 에서\n" +
          "   해당 앱의 로컬(OPEN_MAP_AND_LOCAL) 서비스를 활성화해야 한다.",
      );
    }
    resolutions.set(
      p.id,
      lookup.kind === "found"
        ? matchArea(lookup.doc, sidos, signgus)
        : lookup.kind === "outOfService"
          ? { kind: "failed", reason: REASON_OVERSEAS, kakao: "-" }
          : { kind: "failed", reason: "카카오 법정동(B) 결과 없음 — 해상", kakao: "-" },
    );
    done++;
    if (done % 25 === 0) console.log(`  … ${done}건`);
    await sleep(KAKAO_DELAY_MS);
  }
  console.log(`  완료 ${done}건`);

  const byKind = {
    code: [...resolutions.values()].filter((r) => r.kind === "code").length,
    fallback: [...resolutions.values()].filter((r) => r.kind === "fallback").length,
    failed: [...resolutions.values()].filter((r) => r.kind === "failed").length,
  };

  // ── 4. 연결 보고 ───────────────────────────────────────────────────────────
  const areaLabel = new Map<string, string>();
  for (const s of sidos) areaLabel.set(s.id, `${s.nameEn} (시도)`);
  for (const s of signgus) areaLabel.set(s.id, s.nameEn);

  const overseas = places.filter((p) => {
    const r = resolutions.get(p.id);
    return r?.kind === "failed" && r.reason === REASON_OVERSEAS;
  });

  console.log("\n【4. Place 연결 결과】");
  console.log(`  코드 매칭 성공  ${byKind.code}`);
  console.log(`  이름 폴백       ${byKind.fallback}`);
  console.log(`  실패            ${byKind.failed}  (그중 해외 ${overseas.length})`);
  console.log(`  합계            ${places.length}`);

  console.log("\n【5. 기존 Area 별 전환】");
  const transitions = new Map<string, Map<string, number>>();
  for (const p of places) {
    const from = p.area ? `lv${p.area.level} ${p.area.nameKo}` : "(연결 없음)";
    const r = resolutions.get(p.id);
    const to = r && r.kind !== "failed" ? (areaLabel.get(r.areaId) ?? "?") : "✖ 실패";
    if (!transitions.has(from)) transitions.set(from, new Map());
    const m = transitions.get(from);
    if (m) m.set(to, (m.get(to) ?? 0) + 1);
  }
  for (const [from, m] of [...transitions.entries()].sort((a, b) => {
    const sa = [...a[1].values()].reduce((x, y) => x + y, 0);
    const sb = [...b[1].values()].reduce((x, y) => x + y, 0);
    return sb - sa;
  })) {
    const total = [...m.values()].reduce((x, y) => x + y, 0);
    const parts = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([to, n]) => `${to} ${n}`);
    console.log(`  ${from} ${total} → ${parts.join(", ")}`);
  }

  console.log("\n【6. 실패 목록 전체】");
  const failed = places.filter((p) => resolutions.get(p.id)?.kind === "failed");
  if (failed.length === 0) console.log("  없음");
  for (const p of failed) {
    const r = resolutions.get(p.id);
    const reason = r && r.kind === "failed" ? r.reason : "?";
    const kakao = r ? r.kakao : "-";
    console.log(`  ${p.id}  ${p.nameKo}`);
    console.log(`      좌표=${p.latitude ?? "-"},${p.longitude ?? "-"}  카카오=${kakao}  사유=${reason}`);
  }

  console.log("\n【7. 해외 장소 — 카카오 서비스 영역 밖】");
  if (overseas.length === 0) console.log("  없음");
  for (const p of overseas) {
    console.log(`  ${p.nameKo}${p.nameEn ? ` / ${p.nameEn}` : ""}`);
    console.log(`      ${p.id}  좌표=${p.latitude ?? "-"},${p.longitude ?? "-"}  기존="${p.area?.nameKo ?? "(연결 없음)"}"`);
  }
  console.log(`  합계 ${overseas.length}행 — areaId 는 NULL 로 남는다`);

  console.log("\n【8. 지역이 있었는데 새로 연결 안 되는 Place】");
  const lost = places.filter((p) => p.areaId !== null && resolutions.get(p.id)?.kind === "failed");
  if (lost.length === 0) console.log("  없음");
  for (const p of lost) {
    console.log(`  ${p.nameKo} — 기존 "${p.area?.nameKo ?? "?"}" (lv${p.area?.level ?? "?"})  주소="${(p.addressKo ?? "").slice(0, 50)}"`);
  }
  console.log(`  합계 ${lost.length}행`);

  if (!EXECUTE) {
    console.log("\n── DRY RUN 끝. 쓰지 않았다 ──");
    await prisma.$disconnect();
    return;
  }

  // ── 5. 스냅샷 → 삭제 → 삽입 → 연결 ────────────────────────────────────────
  await confirm();

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshotPath = path.join(SNAPSHOT_DIR, `area-reset-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        dbHost: target.host,
        dbRef: target.ref,
        areas: existingAreas,
        places: places.map((p) => ({
          placeId: p.id,
          nameKo: p.nameKo,
          areaId: p.areaId,
          areaNameKo: p.area?.nameKo ?? null,
          areaNameEn: p.area?.nameEn ?? null,
          areaLevel: p.area?.level ?? null,
          addressKo: p.addressKo,
          latitude: p.latitude,
          longitude: p.longitude,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\n✔ 스냅샷 저장: ${snapshotPath}`);

  // Place 업데이트를 areaId 별로 묶는다 — 200번이 아니라 시군구 수만큼만 돈다
  const grouped = new Map<string, string[]>();
  for (const p of places) {
    const r = resolutions.get(p.id);
    if (!r || r.kind === "failed") continue;
    grouped.set(r.areaId, [...(grouped.get(r.areaId) ?? []), p.id]);
  }

  await prisma.$transaction(
    async (tx) => {
      const removed = await tx.area.deleteMany({});
      console.log(`✔ Area 삭제 ${removed.count}행 (Place.areaId 는 FK SET NULL 로 끊긴다)`);

      await tx.area.createMany({
        data: sidos.map((s) => ({
          id: s.id,
          nameKo: s.nameKo,
          nameEn: s.nameEn,
          level: 0,
          parentId: null,
          lDongRegnCd: s.regnCd,
          lDongSignguCds: [],
          sortOrder: s.sortOrder,
        })),
      });
      const sidoIdByRegn = new Map(sidos.map((s) => [s.regnCd, s.id]));
      await tx.area.createMany({
        data: signgus.map((s) => {
          const parentId = sidoIdByRegn.get(s.regnCd);
          if (!parentId) throw new Error(`${s.nameKo} 의 시도(${s.regnCd}) 가 없다`);
          return {
            id: s.id,
            nameKo: s.nameKo,
            nameEn: s.nameEn,
            level: 1,
            parentId,
            lDongRegnCd: s.regnCd,
            lDongSignguCds: s.signguCds,
            sortOrder: s.sortOrder,
          };
        }),
      });
      console.log(`✔ Area 생성 시도 ${sidos.length} · 시군구 ${signgus.length}`);

      let linked = 0;
      for (const [areaId, placeIds] of grouped) {
        const r = await tx.place.updateMany({ where: { id: { in: placeIds } }, data: { areaId } });
        linked += r.count;
      }
      console.log(`✔ Place 연결 ${linked}행 (실패 ${byKind.failed}행은 areaId NULL)`);
    },
    { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS },
  );

  const total = await prisma.area.count();
  console.log(`\nArea 총 ${total}행`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
