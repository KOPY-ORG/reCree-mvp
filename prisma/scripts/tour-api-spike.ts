// TourAPI 매칭 가능성 측정 — 일회성 스파이크 스크립트
//
// ⚠️ DB는 READ-ONLY (findMany만 사용). 스키마/마이그레이션/src 변경 없음.
//
// 실행 방법 (히스토리 회피: 앞에 공백 한 칸):
//   설치 없이 (권장 — tsx가 devDependencies에 없음, ts-node는 이미 설치되어 있음):
//    TOUR_API_KEY="<디코딩키>" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/tour-api-spike.ts
//
//   tsx를 쓰는 경우 (npx가 원격에서 tsx를 내려받음):
//    TOUR_API_KEY="<디코딩키>" npx tsx prisma/scripts/tour-api-spike.ts
//
// TOUR_API_KEY는 .env.local에 넣어도 됩니다 (env 우선순위: 셸 > .env.local).
// DATABASE_URL은 .env.local에서 자동 로드됩니다.
//
// 총 호출 수: 장소 30건 × 3회 + 축제 2회 = 92회 (M7에서 실측 출력)
// 결과 원본: prisma/scripts/tour-api-spike-result.json (.gitignore 처리됨)

// .env.local 로드 — tsx/ts-node는 자동으로 읽지 않음
try {
  process.loadEnvFile(".env.local");
} catch {}

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const KOR_BASE = "http://apis.data.go.kr/B551011/KorService2";
const ENG_BASE = "http://apis.data.go.kr/B551011/EngService2";

// 공통 필수 파라미터 (contentTypeId는 의도적으로 미지정 — 전체 타입 조회)
const MOBILE_OS = "ETC";
const MOBILE_APP = "recree-mvp-spike";

const PLACE_LIMIT = 30;
const RADIUS_M = 300;
const LOCATION_ROWS = 20;
const KEYWORD_ROWS = 10;
const FESTIVAL_ROWS = 50;
const FESTIVAL_START = "20260801";
const FESTIVAL_END = "20261031";
const CALL_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 15_000;

const RESULT_PATH = path.join(process.cwd(), "prisma/scripts/tour-api-spike-result.json");

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type TourItem = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  dist?: string;
  firstimage?: string;
  [key: string]: unknown;
};

type CallResult = {
  ok: boolean;
  items: TourItem[];
  totalCount: number | null;
  elapsedMs: number;
  error: string | null;
};

type CallFailure = {
  label: string;
  endpoint: string;
  placeId: string | null;
  placeName: string | null;
  reason: string;
};

type EnglishTitleParse = {
  raw: string;
  englishPart: string;
  koreanPart: string | null;
  parsed: boolean;
};

type NameEnVerdict = "exact" | "caseOrSpaceOnly" | "different" | "nameEnNull" | "noEnglishPart";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pct(part: number, total: number): string {
  if (total === 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

/** 한글 제목 비교용 정규화 — 소문자 + 모든 공백 제거 (과도한 정규화는 하지 않음) */
function normTitle(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 제목 일치 판정: 완전일치 또는 서로를 포함 */
function titleMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normTitle(a);
  const nb = normTitle(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * 영문 title 파싱: "English Name (한글명)" → englishPart / koreanPart
 * 문자열 끝에서부터 괄호 균형을 맞춰 가장 바깥쪽 마지막 괄호쌍을 찾는다.
 * 예) "Bupyeong (Kkangtong) Market (부평시장(깡통시장))"
 *      → englishPart="Bupyeong (Kkangtong) Market", koreanPart="부평시장(깡통시장)"
 * 조건 미충족 시 전체를 englishPart로 두고 parsed=false.
 */
function parseEnglishTitle(rawTitle: string | null | undefined): EnglishTitleParse {
  const raw = (rawTitle ?? "").trim();
  const fallback: EnglishTitleParse = { raw, englishPart: raw, koreanPart: null, parsed: false };

  if (!raw.endsWith(")")) return fallback;

  let depth = 0;
  let openIdx = -1;
  for (let i = raw.length - 1; i >= 0; i--) {
    const ch = raw[i];
    if (ch === ")") {
      depth++;
    } else if (ch === "(") {
      depth--;
      if (depth === 0) {
        openIdx = i;
        break;
      }
    }
  }
  if (openIdx < 0) return fallback; // 괄호 불균형

  const inner = raw.slice(openIdx + 1, raw.length - 1).trim();
  const head = raw.slice(0, openIdx).trim();

  // 괄호 안에 한글이 없거나, 앞부분이 비어 있으면 분리하지 않음
  if (!/[가-힣]/.test(inner) || !head) return fallback;

  return { raw, englishPart: head, koreanPart: inner, parsed: true };
}

/** Place.nameEn(구글) vs TourAPI englishPart(관광공사) 비교 */
function compareNameEn(placeNameEn: string | null, englishPart: string | null): NameEnVerdict {
  if (placeNameEn === null || placeNameEn.trim() === "") return "nameEnNull";
  if (englishPart === null || englishPart.trim() === "") return "noEnglishPart";

  const a = placeNameEn.trim();
  const b = englishPart.trim();
  if (a === b) return "exact";

  const loose = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  if (loose(a) === loose(b)) return "caseOrSpaceOnly";

  return "different";
}

// ─── 호출 계측 ────────────────────────────────────────────────────────────────

const timings: number[] = [];
const callFailures: CallFailure[] = [];
let totalCalls = 0;

function normalizeItems(items: unknown): TourItem[] {
  // 결과 0건이면 items가 빈 문자열 ""로 오는 경우가 있음
  if (!items || typeof items === "string") return [];
  const item = (items as { item?: unknown }).item;
  if (!item || typeof item === "string") return [];
  if (Array.isArray(item)) return item as TourItem[];
  return [item as TourItem];
}

/** 실패는 throw하지 않고 ok=false로 반환 (기존 import-actions.ts의 "실패는 null" 패턴) */
async function callTourApi(
  base: string,
  endpoint: string,
  params: Record<string, string | number>,
  ctx: { label: string; placeId: string | null; placeName: string | null }
): Promise<CallResult> {
  const url = new URL(`${base}/${endpoint}`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY!); // 디코딩키 → URLSearchParams가 인코딩
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", "1");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  totalCalls++;
  const startedAt = Date.now();

  const fail = (reason: string, elapsedMs: number): CallResult => {
    callFailures.push({ label: ctx.label, endpoint, placeId: ctx.placeId, placeName: ctx.placeName, reason });
    return { ok: false, items: [], totalCount: null, elapsedMs, error: reason };
  };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const elapsedMs = Date.now() - startedAt;
    timings.push(elapsedMs);

    if (!res.ok) return fail(`HTTP ${res.status}`, elapsedMs);

    const text = await res.text();

    // 인증 실패 등은 _type=json을 무시하고 XML로 응답하는 경우가 있음
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return fail(`JSON 파싱 실패: ${text.slice(0, 200).replace(/\s+/g, " ")}`, elapsedMs);
    }

    const response = (data as { response?: Record<string, unknown> }).response;
    const header = response?.header as { resultCode?: string; resultMsg?: string } | undefined;
    if (!header) return fail(`response.header 없음: ${text.slice(0, 200)}`, elapsedMs);
    if (header.resultCode !== "0000") {
      return fail(`resultCode=${header.resultCode} (${header.resultMsg ?? "메시지 없음"})`, elapsedMs);
    }

    const body = response?.body as { items?: unknown; totalCount?: number } | undefined;
    return {
      ok: true,
      items: normalizeItems(body?.items),
      totalCount: typeof body?.totalCount === "number" ? body.totalCount : null,
      elapsedMs,
      error: null,
    };
  } catch (e) {
    const elapsedMs = Date.now() - startedAt;
    timings.push(elapsedMs);
    return fail(e instanceof Error ? e.message : String(e), elapsedMs);
  }
}

// ─── 대상 장소 조회 (READ-ONLY) ───────────────────────────────────────────────

const PLACE_SELECT = {
  id: true,
  nameKo: true,
  nameEn: true,
  addressKo: true,
  addressEn: true,
  latitude: true,
  longitude: true,
  placeTypes: true,
  isVerified: true,
} as const;

type TargetPlace = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressKo: string | null;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  placeTypes: string[];
  isVerified: boolean;
};

async function fetchTargetPlaces(prisma: PrismaClient): Promise<TargetPlace[]> {
  const hasCoords = { latitude: { not: null }, longitude: { not: null } } as const;

  const verified = await prisma.place.findMany({
    where: { isVerified: true, ...hasCoords },
    select: PLACE_SELECT,
    orderBy: { createdAt: "asc" },
    take: PLACE_LIMIT,
  });

  if (verified.length >= PLACE_LIMIT) return verified as TargetPlace[];

  const rest = await prisma.place.findMany({
    where: { isVerified: false, ...hasCoords },
    select: PLACE_SELECT,
    orderBy: { createdAt: "asc" },
    take: PLACE_LIMIT - verified.length,
  });

  return [...verified, ...rest] as TargetPlace[];
}

// ─── 장소별 스파이크 ──────────────────────────────────────────────────────────

type PlaceSpikeResult = {
  place: TargetPlace;
  kor: {
    locationBased: { ok: boolean; error: string | null; count: number; items: TourItem[] };
    keyword: { ok: boolean; error: string | null; count: number; items: TourItem[] };
  };
  eng: {
    locationBased: { ok: boolean; error: string | null; count: number; items: TourItem[] };
  };
  matching: {
    coordMatched: boolean;
    keywordMatched: boolean;
    coordMatches: { contentid: string; title: string; dist: string | null; addr1: string | null }[];
    keywordMatches: {
      contentid: string;
      title: string;
      addr1: string | null;
      mapx: string | null;
      mapy: string | null;
    }[];
    korContentIds: string[];
    engContentIds: string[];
    contentIdsFoundInEng: string[];
    contentIdsMissingInEng: string[];
  };
  nameEnComparisons: {
    contentid: string;
    engRawTitle: string;
    englishPart: string;
    koreanPart: string | null;
    parsed: boolean;
    placeNameEn: string | null;
    verdict: NameEnVerdict;
  }[];
  error: string | null;
};

async function runPlaceSpike(place: TargetPlace): Promise<PlaceSpikeResult> {
  const ctx = { placeId: place.id, placeName: place.nameKo };
  const mapX = String(place.longitude);
  const mapY = String(place.latitude);

  // 1. 국문 위치기반
  const korLoc = await callTourApi(
    KOR_BASE,
    "locationBasedList2",
    { mapX, mapY, radius: RADIUS_M, numOfRows: LOCATION_ROWS, arrange: "E" },
    { label: "kor:locationBasedList2", ...ctx }
  );
  await sleep(CALL_DELAY_MS);

  // 2. 국문 키워드
  const korKeyword = await callTourApi(
    KOR_BASE,
    "searchKeyword2",
    { keyword: place.nameKo, numOfRows: KEYWORD_ROWS },
    { label: "kor:searchKeyword2", ...ctx }
  );
  await sleep(CALL_DELAY_MS);

  // 3. 영문 위치기반 (1번과 동일 좌표/반경/건수)
  const engLoc = await callTourApi(
    ENG_BASE,
    "locationBasedList2",
    { mapX, mapY, radius: RADIUS_M, numOfRows: LOCATION_ROWS, arrange: "E" },
    { label: "eng:locationBasedList2", ...ctx }
  );
  await sleep(CALL_DELAY_MS);

  // ── 매칭 판정 ──
  const coordMatches = korLoc.items
    .filter((item) => titleMatches(item.title, place.nameKo))
    .map((item) => ({
      contentid: String(item.contentid ?? ""),
      title: String(item.title ?? ""),
      dist: item.dist != null ? String(item.dist) : null,
      addr1: item.addr1 != null ? String(item.addr1) : null,
    }));

  // 키워드매칭: dist 계산 없이 title 일치만 판정, 좌표는 참고용으로 기록
  const keywordMatches = korKeyword.items
    .filter((item) => titleMatches(item.title, place.nameKo))
    .map((item) => ({
      contentid: String(item.contentid ?? ""),
      title: String(item.title ?? ""),
      addr1: item.addr1 != null ? String(item.addr1) : null,
      mapx: item.mapx != null ? String(item.mapx) : null,
      mapy: item.mapy != null ? String(item.mapy) : null,
    }));

  const korContentIds = Array.from(
    new Set([...coordMatches, ...keywordMatches].map((m) => m.contentid).filter(Boolean))
  );
  const engContentIds = engLoc.items.map((item) => String(item.contentid ?? "")).filter(Boolean);
  const engIdSet = new Set(engContentIds);

  const contentIdsFoundInEng = korContentIds.filter((id) => engIdSet.has(id));
  const contentIdsMissingInEng = korContentIds.filter((id) => !engIdSet.has(id));

  // ── 영문명 비교 (국문에서 매칭된 contentid가 영문 결과에도 있는 건만) ──
  const nameEnComparisons: PlaceSpikeResult["nameEnComparisons"] = [];
  for (const id of contentIdsFoundInEng) {
    const engItem = engLoc.items.find((item) => String(item.contentid ?? "") === id);
    if (!engItem) continue;
    const parsed = parseEnglishTitle(engItem.title as string | undefined);
    nameEnComparisons.push({
      contentid: id,
      engRawTitle: parsed.raw,
      englishPart: parsed.englishPart,
      koreanPart: parsed.koreanPart,
      parsed: parsed.parsed,
      placeNameEn: place.nameEn,
      verdict: compareNameEn(place.nameEn, parsed.englishPart),
    });
  }

  return {
    place,
    kor: {
      locationBased: { ok: korLoc.ok, error: korLoc.error, count: korLoc.items.length, items: korLoc.items },
      keyword: { ok: korKeyword.ok, error: korKeyword.error, count: korKeyword.items.length, items: korKeyword.items },
    },
    eng: {
      locationBased: { ok: engLoc.ok, error: engLoc.error, count: engLoc.items.length, items: engLoc.items },
    },
    matching: {
      coordMatched: coordMatches.length > 0,
      keywordMatched: keywordMatches.length > 0,
      coordMatches,
      keywordMatches,
      korContentIds,
      engContentIds,
      contentIdsFoundInEng,
      contentIdsMissingInEng,
    },
    nameEnComparisons,
    error: null,
  };
}

// ─── 축제 조회 (장소 루프와 별개, 각 1회) ─────────────────────────────────────

type FestivalResult = {
  ok: boolean;
  error: string | null;
  totalCount: number | null;
  count: number;
  emptyCoordCount: number;
  items: TourItem[];
};

function isEmptyCoord(item: TourItem): boolean {
  const x = item.mapx == null ? "" : String(item.mapx).trim();
  const y = item.mapy == null ? "" : String(item.mapy).trim();
  return x === "" || y === "";
}

async function runFestivalSpike(base: string, label: string): Promise<FestivalResult> {
  const res = await callTourApi(
    base,
    "searchFestival2",
    { eventStartDate: FESTIVAL_START, eventEndDate: FESTIVAL_END, numOfRows: FESTIVAL_ROWS },
    { label, placeId: null, placeName: null }
  );
  await sleep(CALL_DELAY_MS);

  return {
    ok: res.ok,
    error: res.error,
    totalCount: res.totalCount,
    count: res.items.length,
    emptyCoordCount: res.items.filter(isEmptyCoord).length,
    items: res.items,
  };
}

// ─── 집계 ─────────────────────────────────────────────────────────────────────

function summarize(results: PlaceSpikeResult[], korFestival: FestivalResult, engFestival: FestivalResult) {
  // M1 매칭률
  const m1 = { coordOnly: 0, keywordOnly: 0, both: 0, none: 0, total: results.length };
  for (const r of results) {
    const { coordMatched, keywordMatched } = r.matching;
    if (coordMatched && keywordMatched) m1.both++;
    else if (coordMatched) m1.coordOnly++;
    else if (keywordMatched) m1.keywordOnly++;
    else m1.none++;
  }

  // M2 contentId 동일성
  const m2 = { korMatchedIds: 0, foundInEng: 0, missingInEng: 0 };
  for (const r of results) {
    m2.korMatchedIds += r.matching.korContentIds.length;
    m2.foundInEng += r.matching.contentIdsFoundInEng.length;
    m2.missingInEng += r.matching.contentIdsMissingInEng.length;
  }

  // M3 영문명 비교
  const allComparisons = results.flatMap((r) => r.nameEnComparisons);
  const m3 = {
    total: allComparisons.length,
    exact: 0,
    caseOrSpaceOnly: 0,
    different: 0,
    nameEnNull: 0,
    noEnglishPart: 0,
    differentList: [] as { nameKo: string; placeNameEn: string; tourApiEnglishPart: string }[],
  };
  for (const r of results) {
    for (const c of r.nameEnComparisons) {
      m3[c.verdict]++;
      if (c.verdict === "different") {
        m3.differentList.push({
          nameKo: r.place.nameKo,
          placeNameEn: c.placeNameEn ?? "",
          tourApiEnglishPart: c.englishPart,
        });
      }
    }
  }

  // 영문 title 파싱 실패
  const parseFailures: { placeNameKo: string; contentid: string; rawTitle: string }[] = [];
  for (const r of results) {
    for (const item of r.eng.locationBased.items) {
      const parsed = parseEnglishTitle(item.title as string | undefined);
      if (!parsed.parsed) {
        parseFailures.push({
          placeNameKo: r.place.nameKo,
          contentid: String(item.contentid ?? ""),
          rawTitle: parsed.raw,
        });
      }
    }
  }

  // M4 영문 필드 채움률 (영문 위치기반 결과 전체 기준)
  const engItems = results.flatMap((r) => r.eng.locationBased.items);
  const m4 = {
    totalEngItems: engItems.length,
    titleHasLatin: 0,
    addrRoman: 0,
    addrKorean: 0,
    addrEmpty: 0,
    parseFailureCount: parseFailures.length,
    parseFailureRateBase: engItems.length,
  };
  for (const item of engItems) {
    const title = String(item.title ?? "");
    if (/[A-Za-z]/.test(title)) m4.titleHasLatin++;

    const addr = String(item.addr1 ?? "").trim();
    if (addr === "") m4.addrEmpty++;
    else if (/[가-힣]/.test(addr)) m4.addrKorean++;
    else if (/[A-Za-z]/.test(addr)) m4.addrRoman++;
    else m4.addrEmpty++;
  }

  // M5 응답시간
  const sorted = [...timings].sort((a, b) => a - b);
  const m5 = {
    samples: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
  };

  // M6 축제
  const m6 = {
    kor: {
      ok: korFestival.ok,
      error: korFestival.error,
      totalCount: korFestival.totalCount,
      count: korFestival.count,
      emptyCoordCount: korFestival.emptyCoordCount,
    },
    eng: {
      ok: engFestival.ok,
      error: engFestival.error,
      totalCount: engFestival.totalCount,
      count: engFestival.count,
      emptyCoordCount: engFestival.emptyCoordCount,
    },
  };

  // M7 총 호출
  const m7 = { totalCalls, failedCalls: callFailures.length };

  return { m1, m2, m3, m4, m5, m6, m7, parseFailures };
}

// ─── 콘솔 출력 ────────────────────────────────────────────────────────────────

function printSummary(s: ReturnType<typeof summarize>) {
  const line = "─".repeat(78);

  console.log(`\n${line}`);
  console.log("TourAPI 스파이크 결과 요약");
  console.log(line);

  // M1
  console.log("\n【M1】 매칭률");
  console.log(`  대상 장소: ${s.m1.total}건`);
  console.log(`  좌표만 매칭   : ${s.m1.coordOnly}건 (${pct(s.m1.coordOnly, s.m1.total)})`);
  console.log(`  키워드만 매칭 : ${s.m1.keywordOnly}건 (${pct(s.m1.keywordOnly, s.m1.total)})`);
  console.log(`  둘 다 매칭    : ${s.m1.both}건 (${pct(s.m1.both, s.m1.total)})`);
  console.log(`  둘 다 실패    : ${s.m1.none}건 (${pct(s.m1.none, s.m1.total)})`);
  const anyMatch = s.m1.total - s.m1.none;
  console.log(`  → 하나라도 매칭: ${anyMatch}건 (${pct(anyMatch, s.m1.total)})`);

  // M2
  console.log("\n【M2】 contentId 동일성 (국문 매칭 contentid가 영문 결과에도 존재하는가)");
  console.log(`  국문에서 찾은 contentid: ${s.m2.korMatchedIds}개`);
  console.log(`  영문 결과에도 존재     : ${s.m2.foundInEng}개 (${pct(s.m2.foundInEng, s.m2.korMatchedIds)})`);
  console.log(`  영문 결과에 없음       : ${s.m2.missingInEng}개 (${pct(s.m2.missingInEng, s.m2.korMatchedIds)})`);

  // M3
  console.log("\n【M3】 영문명 비교 — Place.nameEn(구글) vs TourAPI englishPart(관광공사)");
  console.log(`  비교 대상: ${s.m3.total}건`);
  console.log(`  완전일치          : ${s.m3.exact}건 (${pct(s.m3.exact, s.m3.total)})`);
  console.log(`  대소문자·공백만 차이: ${s.m3.caseOrSpaceOnly}건 (${pct(s.m3.caseOrSpaceOnly, s.m3.total)})`);
  console.log(`  실질적으로 다름    : ${s.m3.different}건 (${pct(s.m3.different, s.m3.total)})`);
  console.log(`  Place.nameEn null  : ${s.m3.nameEnNull}건 (${pct(s.m3.nameEnNull, s.m3.total)})`);
  if (s.m3.noEnglishPart > 0) {
    console.log(`  englishPart 없음   : ${s.m3.noEnglishPart}건 (${pct(s.m3.noEnglishPart, s.m3.total)})`);
  }

  if (s.m3.differentList.length > 0) {
    console.log("\n  ── 실질적으로 다른 건 전체 목록 ──");
    const w1 = Math.max(6, ...s.m3.differentList.map((d) => [...d.nameKo].length));
    const w2 = Math.max(13, ...s.m3.differentList.map((d) => d.placeNameEn.length));
    const pad = (str: string, width: number) => {
      // 한글은 폭 2로 계산
      const visual = [...str].reduce((acc, ch) => acc + (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch) ? 2 : 1), 0);
      return str + " ".repeat(Math.max(1, width - visual + 1));
    };
    console.log(`  ${pad("nameKo", w1 * 2)}${pad("Place.nameEn", w2)}TourAPI englishPart`);
    for (const d of s.m3.differentList) {
      console.log(`  ${pad(d.nameKo, w1 * 2)}${pad(d.placeNameEn, w2)}${d.tourApiEnglishPart}`);
    }
  }

  // M4
  console.log("\n【M4】 영문 필드 채움률 (EngService2 위치기반 결과 전체)");
  console.log(`  영문 아이템 총계     : ${s.m4.totalEngItems}건`);
  console.log(`  title에 영문자 포함  : ${s.m4.titleHasLatin}건 (${pct(s.m4.titleHasLatin, s.m4.totalEngItems)})`);
  console.log(`  addr1 로마자         : ${s.m4.addrRoman}건 (${pct(s.m4.addrRoman, s.m4.totalEngItems)})`);
  console.log(`  addr1 한글 포함      : ${s.m4.addrKorean}건 (${pct(s.m4.addrKorean, s.m4.totalEngItems)})`);
  console.log(`  addr1 빈 값/기타     : ${s.m4.addrEmpty}건 (${pct(s.m4.addrEmpty, s.m4.totalEngItems)})`);
  console.log(
    `  영문 title 파싱 실패 : ${s.m4.parseFailureCount}건 (${pct(s.m4.parseFailureCount, s.m4.parseFailureRateBase)})`
  );
  if (s.parseFailures.length > 0) {
    console.log("  ── 파싱 실패 샘플 (최대 10건) ──");
    for (const f of s.parseFailures.slice(0, 10)) {
      console.log(`    [${f.contentid}] ${f.rawTitle}`);
    }
    if (s.parseFailures.length > 10) {
      console.log(`    ... 외 ${s.parseFailures.length - 10}건 (전체는 결과 JSON 참조)`);
    }
  }

  // M5
  console.log("\n【M5】 응답시간 (전체 호출)");
  console.log(`  샘플: ${s.m5.samples}회`);
  console.log(`  p50: ${s.m5.p50}ms / p95: ${s.m5.p95}ms / max: ${s.m5.max}ms`);

  // M6
  console.log(`\n【M6】 축제 (searchFestival2, ${FESTIVAL_START}~${FESTIVAL_END}, numOfRows=${FESTIVAL_ROWS})`);
  for (const [label, f] of [["국문", s.m6.kor], ["영문", s.m6.eng]] as const) {
    if (!f.ok) {
      console.log(`  ${label}: 호출 실패 — ${f.error}`);
      continue;
    }
    console.log(
      `  ${label}: 수신 ${f.count}건 (totalCount=${f.totalCount ?? "?"}) / mapx·mapy 빈 값 ${f.emptyCoordCount}건 (${pct(
        f.emptyCoordCount,
        f.count
      )})`
    );
  }

  // M7
  console.log("\n【M7】 총 호출 횟수 (한도 소진량)");
  console.log(`  총 호출: ${s.m7.totalCalls}회 / 실패: ${s.m7.failedCalls}회`);
  if (callFailures.length > 0) {
    console.log("  ── 실패 목록 (최대 15건) ──");
    for (const f of callFailures.slice(0, 15)) {
      console.log(`    ${f.label} [${f.placeName ?? "-"}] ${f.reason}`);
    }
    if (callFailures.length > 15) {
      console.log(`    ... 외 ${callFailures.length - 15}건 (전체는 결과 JSON 참조)`);
    }
  }

  console.log(`\n${line}\n`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.error("❌ TOUR_API_KEY가 없습니다.");
    console.error("");
    console.error("   공공데이터포털의 '디코딩(Decoding)' 키를 넣어 주세요. 인코딩키가 아닙니다.");
    console.error("   실행 예:");
    console.error("     TOUR_API_KEY=\"<디코딩키>\" npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/scripts/tour-api-spike.ts");
    console.error("   또는 .env.local에 TOUR_API_KEY=... 추가");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL이 없습니다. .env.local을 확인해 주세요.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const startedAt = new Date();
  const results: PlaceSpikeResult[] = [];
  let korFestival: FestivalResult = { ok: false, error: "미실행", totalCount: null, count: 0, emptyCoordCount: 0, items: [] };
  let engFestival: FestivalResult = { ok: false, error: "미실행", totalCount: null, count: 0, emptyCoordCount: 0, items: [] };

  try {
    console.log("📍 대상 장소 조회 중... (READ-ONLY)");
    const places = await fetchTargetPlaces(prisma);
    const verifiedCount = places.filter((p) => p.isVerified).length;
    console.log(
      `   ${places.length}건 선정 (isVerified=true ${verifiedCount}건 / false ${places.length - verifiedCount}건)\n`
    );

    if (places.length === 0) {
      console.error("❌ 위경도가 있는 Place가 없습니다. 중단합니다.");
      return;
    }

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const label = `[${i + 1}/${places.length}] ${place.nameKo}`;
      try {
        const result = await runPlaceSpike(place);
        const mark = result.matching.coordMatched || result.matching.keywordMatched ? "✅" : "⬜";
        console.log(
          `${mark} ${label} — 좌표 ${result.kor.locationBased.count}건/매칭 ${result.matching.coordMatches.length}, ` +
            `키워드 ${result.kor.keyword.count}건/매칭 ${result.matching.keywordMatches.length}, ` +
            `영문 ${result.eng.locationBased.count}건`
        );
        results.push(result);
      } catch (e) {
        // 장소별 try/catch — 전체가 중단되지 않도록
        const reason = e instanceof Error ? e.message : String(e);
        console.log(`⚠️  ${label} — 처리 실패: ${reason}`);
        callFailures.push({
          label: "place:unexpected",
          endpoint: "-",
          placeId: place.id,
          placeName: place.nameKo,
          reason,
        });
        results.push({
          place,
          kor: {
            locationBased: { ok: false, error: reason, count: 0, items: [] },
            keyword: { ok: false, error: reason, count: 0, items: [] },
          },
          eng: { locationBased: { ok: false, error: reason, count: 0, items: [] } },
          matching: {
            coordMatched: false,
            keywordMatched: false,
            coordMatches: [],
            keywordMatches: [],
            korContentIds: [],
            engContentIds: [],
            contentIdsFoundInEng: [],
            contentIdsMissingInEng: [],
          },
          nameEnComparisons: [],
          error: reason,
        });
      }
    }

    console.log("\n🎪 축제 조회 중...");
    try {
      korFestival = await runFestivalSpike(KOR_BASE, "kor:searchFestival2");
      console.log(`   국문: ${korFestival.ok ? `${korFestival.count}건` : `실패 — ${korFestival.error}`}`);
    } catch (e) {
      console.log(`   국문: 처리 실패 — ${e instanceof Error ? e.message : String(e)}`);
    }
    try {
      engFestival = await runFestivalSpike(ENG_BASE, "eng:searchFestival2");
      console.log(`   영문: ${engFestival.ok ? `${engFestival.count}건` : `실패 — ${engFestival.error}`}`);
    } catch (e) {
      console.log(`   영문: 처리 실패 — ${e instanceof Error ? e.message : String(e)}`);
    }

    const summary = summarize(results, korFestival, engFestival);
    printSummary(summary);

    const payload = {
      meta: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        placeCount: results.length,
        radiusM: RADIUS_M,
        locationRows: LOCATION_ROWS,
        keywordRows: KEYWORD_ROWS,
        festivalRange: { start: FESTIVAL_START, end: FESTIVAL_END, numOfRows: FESTIVAL_ROWS },
        korBase: KOR_BASE,
        engBase: ENG_BASE,
        note: "contentTypeId 미지정(전체 타입 조회). DB는 findMany만 사용한 READ-ONLY 스파이크.",
      },
      metrics: {
        M1_matching: summary.m1,
        M2_contentIdParity: summary.m2,
        M3_englishNameComparison: summary.m3,
        M4_englishFieldFill: summary.m4,
        M5_latencyMs: summary.m5,
        M6_festival: summary.m6,
        M7_calls: summary.m7,
      },
      places: results,
      englishTitleParseFailures: summary.parseFailures,
      callFailures,
      festivals: { kor: korFestival, eng: engFestival },
      latencySamplesMs: timings,
    };

    fs.writeFileSync(RESULT_PATH, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`💾 원본 결과 저장: ${RESULT_PATH}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n❌ 스파이크 중단:", e);
  process.exit(1);
});
