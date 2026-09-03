// TourAPI 지역 커버리지 측정 — 일회성 스파이크 스크립트 (2차)
//
// ⚠️ DB는 READ-ONLY (findMany만 사용). 스키마/마이그레이션/src 변경 없음.
//
// 1차(tour-api-spike.ts)가 "우리 Place가 TourAPI와 매칭되는가"를 봤다면,
// 2차는 "TourAPI가 우리 타깃 지역 5곳을 얼마나 덮고 있는가"를 본다.
//
// 대상 지역: 서울 / 부산 / 경주(경북) / 순천(전남) / 강릉(강원)
//   → 지역 코드는 하드코딩하지 않고 areaCode2 / ldongCode2로 실제 조회해 이름으로 해석한다.
//     사용자 추정값(1/6/35/38/32)은 guessedAreaCode에 넣어두고 일치 여부만 검증한다.
//
// 측정 항목 (KorService2 / EngService2 양쪽):
//   M1  ldongCode2        — 서울·부산 시군구 목록 vs 우리 Area 이름 매칭
//   M2  areaBasedList2    — 지역별 총 건수 / 이미지 보유율 / 좌표 보유율
//   M3  searchStay2       — 지역별 총 건수 + 상위 5개 이름
//   M4  searchFestival2   — 지역별 오늘 기준 진행중 축제 건수
//   M5  locationBasedList2— 경주·순천·강릉 중심좌표 반경 5km 건수
//
// ⚠️ 지역 필터 코드 체계가 두 벌이다 (1차 실행에서 실측 확인):
//    (a) areaCode / sigunguCode        — 구(舊) 관광지역 코드
//    (b) lDongRegnCd / lDongSignguCd   — 법정동 코드
//    같은 지역이라도 결과가 크게 다르다. 예) KorService2 areaBasedList2 서울:
//      areaCode=1 → 2,086건  vs  lDongRegnCd=11 → 8,005건 (약 3.8배)
//    searchFestival2는 더 극단적이다 — 최근 축제 레코드의 areacode가 전부 빈 값이라
//    areaCode 필터로는 0건이 나온다 (lDongRegnCd=11이면 122건).
//    어느 쪽이 맞다고 단정하지 않고 M2~M4를 두 체계로 각각 조회해 나란히 출력한다.
//
// 실행 방법 (히스토리 회피: 앞에 공백 한 칸):
//   설치 없이 (권장 — tsx가 devDependencies에 없음, ts-node는 이미 설치되어 있음):
//    TOUR_API_KEY="<디코딩키>" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/tour-api-spike-2.ts
//
//   tsx를 쓰는 경우 (npx가 원격에서 tsx를 내려받음):
//    TOUR_API_KEY="<디코딩키>" npx tsx prisma/scripts/tour-api-spike-2.ts
//
// TOUR_API_KEY는 .env.local에 넣어도 됩니다 (env 우선순위: 셸 > .env.local).
// DATABASE_URL은 .env.local에서 자동 로드됩니다. (M1의 Area 비교에만 사용)
//
// 예상 총 호출 수: 약 110~130회 (마지막 "호출 집계"에서 실측 출력)
// 결과 원본: prisma/scripts/tour-api-spike-2-result.json (.gitignore 처리됨)

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

const MOBILE_OS = "ETC";
const MOBILE_APP = "recree-mvp-spike-2";

const CALL_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 15_000;

/** areaCode2 시도 목록 조회 행 수 (전국 17개 + 여유) */
const SIDO_ROWS = 50;
/** areaCode2 시군구 목록 조회 행 수 */
const SIGUNGU_ROWS = 100;
/** ldongCode2 조회 행 수 */
const LDONG_ROWS = 200;
/** M2 areaBasedList2 표본 크기 — 이미지·좌표 보유율은 이 표본 기준 */
const AREA_SAMPLE_ROWS = 100;
/** M3 searchStay2 상위 N개 */
const STAY_TOP_N = 5;
/** M4 축제 조회 시 오늘로부터 며칠 전까지 거슬러 올라갈지 (장기 축제 포착용) */
const FESTIVAL_LOOKBACK_DAYS = 180;
const FESTIVAL_ROWS = 100;
/** M4 최대 페이지 수 — 초과하면 truncated 플래그를 남긴다 */
const FESTIVAL_MAX_PAGES = 3;
/** M5 반경 (m) */
const RADIUS_M = 5_000;

const RESULT_PATH = path.join(process.cwd(), "prisma/scripts/tour-api-spike-2-result.json");

// ─── 대상 지역 정의 ───────────────────────────────────────────────────────────

type ServiceKind = "kor" | "eng";

/** 지역 필터 코드 체계 — 둘 다 조회해 비교한다 */
type FilterMode = "area" | "ldong";
const FILTER_MODES: FilterMode[] = ["area", "ldong"];
const MODE_LABEL: Record<FilterMode, string> = {
  area: "areaCode",
  ldong: "lDong",
};

type RegionSpec = {
  key: "seoul" | "busan" | "gyeongju" | "suncheon" | "gangneung";
  label: string;
  /** 사용자 추정 areaCode — 실제 조회값과 대조만 하고 조회에는 쓰지 않는다 */
  guessedAreaCode: number;
  /** 1단계(시도) 이름 후보 — areaCode2 / ldongCode2 공용 */
  sidoNamesKo: string[];
  sidoNamesEn: string[];
  /** 2단계(시군구) 이름 후보. null이면 시도 자체가 대상(서울·부산) */
  sigunguNamesKo: string[] | null;
  sigunguNamesEn: string[] | null;
  /** M1에서 우리 Area 이름과 시군구 목록을 대조할 대상인가 (서울·부산) */
  compareOurAreas: boolean;
  /**
   * M5 반경 조회용 중심좌표.
   * ⚠️ Area 모델에 좌표 컬럼이 없어(prisma/schema.prisma:309-322) DB에서 가져올 수 없다.
   *    아래 값은 각 시의 대표 지점 좌표를 스크립트에 직접 적어둔 것이며,
   *    "행정구역 중심"이 아니라 "관광 중심지" 기준이다.
   */
  center: { lat: number; lng: number; note: string } | null;
};

const REGIONS: RegionSpec[] = [
  {
    key: "seoul",
    label: "서울",
    guessedAreaCode: 1,
    sidoNamesKo: ["서울", "서울특별시"],
    sidoNamesEn: ["Seoul"],
    sigunguNamesKo: null,
    sigunguNamesEn: null,
    compareOurAreas: true,
    center: null,
  },
  {
    key: "busan",
    label: "부산",
    guessedAreaCode: 6,
    sidoNamesKo: ["부산", "부산광역시"],
    sidoNamesEn: ["Busan"],
    sigunguNamesKo: null,
    sigunguNamesEn: null,
    compareOurAreas: true,
    center: null,
  },
  {
    key: "gyeongju",
    label: "경주(경북)",
    guessedAreaCode: 35,
    sidoNamesKo: ["경상북도", "경북"],
    sidoNamesEn: ["Gyeongsangbuk-do", "Gyeongbuk", "Gyeongsangbuk"],
    sigunguNamesKo: ["경주시", "경주"],
    sigunguNamesEn: ["Gyeongju-si", "Gyeongju"],
    compareOurAreas: false,
    center: { lat: 35.8562, lng: 129.2247, note: "경주 대릉원·첨성대 일대" },
  },
  {
    key: "suncheon",
    label: "순천(전남)",
    guessedAreaCode: 38,
    sidoNamesKo: ["전라남도", "전남"],
    sidoNamesEn: ["Jeollanam-do", "Jeonnam", "Jeollanam"],
    sigunguNamesKo: ["순천시", "순천"],
    sigunguNamesEn: ["Suncheon-si", "Suncheon"],
    compareOurAreas: false,
    center: { lat: 34.9506, lng: 127.4872, note: "순천시청 일대" },
  },
  {
    key: "gangneung",
    label: "강릉(강원)",
    guessedAreaCode: 32,
    sidoNamesKo: ["강원특별자치도", "강원도", "강원"],
    sidoNamesEn: ["Gangwon-do", "Gangwon", "Gangwon State"],
    sigunguNamesKo: ["강릉시", "강릉"],
    sigunguNamesEn: ["Gangneung-si", "Gangneung"],
    compareOurAreas: false,
    center: { lat: 37.7519, lng: 128.8761, note: "강릉역·중앙시장 일대" },
  },
];

/**
 * ldongCode2 응답 필드명. 1차 실행에서 실측 확인한 결과 areaCode2와 동일하게
 * `code` / `name`으로 내려온다. 문서와 다를 수 있어 후보를 남겨둔다.
 */
const LDONG_CODE_KEYS = ["code", "lDongRegnCd", "lDongSignguCd", "ldongRegnCd", "ldongSignguCd"];
const LDONG_NAME_KEYS = ["name", "lDongRegnNm", "lDongSignguNm", "ldongRegnNm", "ldongSignguNm"];

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
  firstimage2?: string;
  code?: string;
  name?: string;
  areacode?: string;
  sigungucode?: string;
  eventstartdate?: string;
  eventenddate?: string;
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
  service: ServiceKind;
  regionKey: string | null;
  reason: string;
};

/** 호출 1건의 응답시간 기록 */
type Timing = {
  label: string;
  service: ServiceKind;
  endpoint: string;
  regionKey: string | null;
  elapsedMs: number;
  ok: boolean;
};

type MatchedBy = "exact" | "partial" | null;

/** areaCode2로 해석한 구(舊) 관광지역 코드 */
type ResolvedArea = {
  regionKey: RegionSpec["key"];
  label: string;
  guessedAreaCode: number;
  areaCode: string | null;
  areaName: string | null;
  areaMatchedBy: MatchedBy;
  sigunguCode: string | null;
  sigunguName: string | null;
  sigunguMatchedBy: MatchedBy;
  /** 추정 areaCode와 실제 조회 결과가 같은가 */
  guessVerdict: "일치" | "불일치" | "확인불가";
  error: string | null;
};

type LdongEntry = { code: string | null; name: string };

/** ldongCode2로 해석한 법정동 코드 */
type ResolvedLdong = {
  regionKey: RegionSpec["key"];
  label: string;
  regnCode: string | null;
  regnName: string | null;
  regnMatchedBy: MatchedBy;
  signguCode: string | null;
  signguName: string | null;
  signguMatchedBy: MatchedBy;
  /** 해당 시도의 시군구 전체 목록 (M1 비교에 재사용) */
  entries: LdongEntry[];
  /** 실제 응답 아이템의 키 목록 — 필드명 추정이 맞았는지 사람이 확인할 수 있도록 */
  sampleItemKeys: string[];
  error: string | null;
};

type AreaMatchRow = {
  areaId: string;
  areaName: string;
  matchedTourName: string | null;
  matchedBy: MatchedBy;
};

type M1RegionResult = {
  regionKey: string;
  label: string;
  regnCode: string | null;
  regnName: string | null;
  tourSigunguCount: number;
  sampleItemKeys: string[];
  error: string | null;
  ourAreaCount: number;
  matchedCount: number;
  unmatchedOurAreas: string[];
  /** TourAPI에는 있으나 우리 Area에 없는 시군구 */
  unmatchedTourNames: string[];
  rows: AreaMatchRow[];
};

type M2RegionResult = {
  regionKey: string;
  label: string;
  mode: FilterMode;
  params: Record<string, string> | null;
  ok: boolean;
  error: string | null;
  totalCount: number | null;
  sampleSize: number;
  withImage: number;
  withCoord: number;
  elapsedMs: number;
};

type M3RegionResult = {
  regionKey: string;
  label: string;
  mode: FilterMode;
  params: Record<string, string> | null;
  ok: boolean;
  error: string | null;
  totalCount: number | null;
  topNames: string[];
  elapsedMs: number;
};

type M4RegionResult = {
  regionKey: string;
  label: string;
  mode: FilterMode;
  params: Record<string, string> | null;
  ok: boolean;
  error: string | null;
  /** API가 보고한 총 건수 (조회 범위 전체 — 진행중만이 아님) */
  totalCount: number | null;
  /** 실제 수신한 아이템 수 */
  fetchedCount: number;
  /** 오늘이 [eventstartdate, eventenddate] 안에 드는 건수 */
  ongoingCount: number;
  /** 날짜 필드가 비어 판정 불가한 건수 */
  undatedCount: number;
  /** 페이지 상한에 걸려 전부 못 받았는가 */
  truncated: boolean;
  elapsedMs: number;
};

type M5RegionResult = {
  regionKey: string;
  label: string;
  ok: boolean;
  error: string | null;
  center: { lat: number; lng: number; note: string } | null;
  totalCount: number | null;
  elapsedMs: number;
};

type ServiceReport = {
  service: ServiceKind;
  base: string;
  areaResolution: ResolvedArea[];
  ldongResolution: ResolvedLdong[];
  m1: M1RegionResult[];
  m2: M2RegionResult[];
  m3: M3RegionResult[];
  m4: M4RegionResult[];
  m5: M5RegionResult[];
};

type OurArea = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  level: number;
  parent: { id: string; nameKo: string; nameEn: string | null } | null;
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pct(part: number, total: number): string {
  if (total === 0) return "-";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

/** 지역명 비교용 정규화 — 소문자 + 공백/하이픈/점 제거 */
function normName(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[\s\-·.]/g, "");
}

/** 한글·CJK는 폭 2로 계산한 표시 폭 */
function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(ch) ? 2 : 1;
  }
  return w;
}

function padCell(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - visualWidth(s)));
}

/** 헤더 + 행 배열을 정렬된 표로 출력 */
function renderTable(headers: string[], rows: string[][], indent = "  "): void {
  const widths = headers.map((h, i) =>
    Math.max(visualWidth(h), ...rows.map((r) => visualWidth(r[i] ?? "")))
  );
  const sep = widths.map((w) => "─".repeat(w)).join("─┼─");
  console.log(`${indent}${headers.map((h, i) => padCell(h, widths[i])).join(" │ ")}`);
  console.log(`${indent}${sep}`);
  if (rows.length === 0) {
    console.log(`${indent}(데이터 없음)`);
    return;
  }
  for (const row of rows) {
    console.log(`${indent}${row.map((c, i) => padCell(c ?? "", widths[i])).join(" │ ")}`);
  }
}

/** YYYYMMDD */
function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function num(n: number | null): string {
  return n === null ? "?" : n.toLocaleString();
}

function pickField(item: TourItem, keys: string[]): string | null {
  for (const key of keys) {
    const v = item[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** 후보 이름들로 목록에서 항목을 찾는다. 완전일치 우선, 없으면 부분일치 */
function findByNames<T>(
  list: T[],
  getName: (t: T) => string | null,
  candidates: string[]
): { item: T; matchedBy: "exact" | "partial" } | null {
  const norms = candidates.map(normName).filter(Boolean);
  for (const cand of norms) {
    for (const it of list) {
      if (normName(getName(it)) === cand) return { item: it, matchedBy: "exact" };
    }
  }
  for (const cand of norms) {
    for (const it of list) {
      const n = normName(getName(it));
      if (!n) continue;
      if (n.includes(cand) || cand.includes(n)) return { item: it, matchedBy: "partial" };
    }
  }
  return null;
}

function hasCoord(item: TourItem): boolean {
  const x = Number(item.mapx);
  const y = Number(item.mapy);
  return Number.isFinite(x) && Number.isFinite(y) && x !== 0 && y !== 0;
}

function hasImage(item: TourItem): boolean {
  const a = typeof item.firstimage === "string" ? item.firstimage.trim() : "";
  const b = typeof item.firstimage2 === "string" ? item.firstimage2.trim() : "";
  return a !== "" || b !== "";
}

// ─── 호출 ─────────────────────────────────────────────────────────────────────

const timings: Timing[] = [];
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

/** 실패는 throw하지 않고 ok=false로 반환 (1차 스파이크와 동일 패턴) */
async function callTourApi(
  base: string,
  endpoint: string,
  params: Record<string, string | number>,
  ctx: { label: string; service: ServiceKind; regionKey: string | null }
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

  const record = (elapsedMs: number, ok: boolean) => {
    timings.push({ label: ctx.label, service: ctx.service, endpoint, regionKey: ctx.regionKey, elapsedMs, ok });
  };

  const fail = (reason: string, elapsedMs: number): CallResult => {
    callFailures.push({
      label: ctx.label,
      endpoint,
      service: ctx.service,
      regionKey: ctx.regionKey,
      reason,
    });
    return { ok: false, items: [], totalCount: null, elapsedMs, error: reason };
  };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      record(elapsedMs, false);
      return fail(`HTTP ${res.status}`, elapsedMs);
    }

    const text = await res.text();

    // 인증 실패 등은 _type=json을 무시하고 XML로 응답하는 경우가 있음
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      record(elapsedMs, false);
      return fail(`JSON 파싱 실패: ${text.slice(0, 200).replace(/\s+/g, " ")}`, elapsedMs);
    }

    const response = (data as { response?: Record<string, unknown> }).response;
    const header = response?.header as { resultCode?: string; resultMsg?: string } | undefined;
    if (!header) {
      record(elapsedMs, false);
      return fail(`response.header 없음: ${text.slice(0, 200)}`, elapsedMs);
    }
    if (header.resultCode !== "0000") {
      record(elapsedMs, false);
      return fail(`resultCode=${header.resultCode} (${header.resultMsg ?? "메시지 없음"})`, elapsedMs);
    }

    record(elapsedMs, true);
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
    record(elapsedMs, false);
    return fail(e instanceof Error ? e.message : String(e), elapsedMs);
  }
}

// ─── 0단계-a: areaCode2로 구 관광지역 코드 해석 ───────────────────────────────

async function resolveAreaCodes(base: string, service: ServiceKind): Promise<ResolvedArea[]> {
  const sidoRes = await callTourApi(
    base,
    "areaCode2",
    { numOfRows: SIDO_ROWS },
    { label: `${service}:areaCode2(시도)`, service, regionKey: null }
  );
  await sleep(CALL_DELAY_MS);

  const blank = (region: RegionSpec, error: string | null): ResolvedArea => ({
    regionKey: region.key,
    label: region.label,
    guessedAreaCode: region.guessedAreaCode,
    areaCode: null,
    areaName: null,
    areaMatchedBy: null,
    sigunguCode: null,
    sigunguName: null,
    sigunguMatchedBy: null,
    guessVerdict: "확인불가",
    error,
  });

  if (!sidoRes.ok) return REGIONS.map((r) => blank(r, sidoRes.error));

  const resolved: ResolvedArea[] = [];

  for (const region of REGIONS) {
    const names = service === "kor" ? region.sidoNamesKo : region.sidoNamesEn;
    const hit = findByNames(sidoRes.items, (it) => pickField(it, ["name"]), names);

    if (!hit) {
      resolved.push(blank(region, `시도 목록에서 이름 매칭 실패 (후보: ${names.join(", ")})`));
      continue;
    }

    const areaCode = pickField(hit.item, ["code"]);
    const entry: ResolvedArea = {
      regionKey: region.key,
      label: region.label,
      guessedAreaCode: region.guessedAreaCode,
      areaCode,
      areaName: pickField(hit.item, ["name"]),
      areaMatchedBy: hit.matchedBy,
      sigunguCode: null,
      sigunguName: null,
      sigunguMatchedBy: null,
      guessVerdict:
        areaCode === null ? "확인불가" : Number(areaCode) === region.guessedAreaCode ? "일치" : "불일치",
      error: null,
    };

    const sigunguNames = service === "kor" ? region.sigunguNamesKo : region.sigunguNamesEn;
    if (sigunguNames && areaCode) {
      const sgRes = await callTourApi(
        base,
        "areaCode2",
        { areaCode, numOfRows: SIGUNGU_ROWS },
        { label: `${service}:areaCode2(시군구/${region.key})`, service, regionKey: region.key }
      );
      await sleep(CALL_DELAY_MS);

      if (!sgRes.ok) {
        entry.error = `시군구 조회 실패: ${sgRes.error}`;
      } else {
        const sgHit = findByNames(sgRes.items, (it) => pickField(it, ["name"]), sigunguNames);
        if (sgHit) {
          entry.sigunguCode = pickField(sgHit.item, ["code"]);
          entry.sigunguName = pickField(sgHit.item, ["name"]);
          entry.sigunguMatchedBy = sgHit.matchedBy;
        } else {
          entry.error = `시군구 이름 매칭 실패 (후보: ${sigunguNames.join(", ")})`;
        }
      }
    }

    resolved.push(entry);
  }

  return resolved;
}

// ─── 0단계-b: ldongCode2로 법정동 코드 해석 ───────────────────────────────────

/**
 * 시도 목록 1회 + 시도별 시군구 목록 1회씩만 호출한다 (시도 코드로 캐시).
 * 시군구 목록은 M1의 Area 비교에도 그대로 재사용한다.
 */
async function resolveLdongCodes(base: string, service: ServiceKind): Promise<ResolvedLdong[]> {
  const regnRes = await callTourApi(
    base,
    "ldongCode2",
    { numOfRows: LDONG_ROWS },
    { label: `${service}:ldongCode2(시도)`, service, regionKey: null }
  );
  await sleep(CALL_DELAY_MS);

  const blank = (region: RegionSpec, error: string | null): ResolvedLdong => ({
    regionKey: region.key,
    label: region.label,
    regnCode: null,
    regnName: null,
    regnMatchedBy: null,
    signguCode: null,
    signguName: null,
    signguMatchedBy: null,
    entries: [],
    sampleItemKeys: [],
    error,
  });

  if (!regnRes.ok) return REGIONS.map((r) => blank(r, regnRes.error));

  // 시도코드 → 시군구 목록 캐시 (같은 시도를 두 번 호출하지 않도록)
  const sigunguCache = new Map<string, { entries: LdongEntry[]; keys: string[]; error: string | null }>();

  const resolved: ResolvedLdong[] = [];

  for (const region of REGIONS) {
    const names = service === "kor" ? region.sidoNamesKo : region.sidoNamesEn;
    const hit = findByNames(regnRes.items, (it) => pickField(it, LDONG_NAME_KEYS), names);

    if (!hit) {
      const e = blank(region, `법정동 시도 목록에서 이름 매칭 실패 (후보: ${names.join(", ")})`);
      e.sampleItemKeys = regnRes.items[0] ? Object.keys(regnRes.items[0]) : [];
      resolved.push(e);
      continue;
    }

    const regnCode = pickField(hit.item, LDONG_CODE_KEYS);
    const entry: ResolvedLdong = {
      regionKey: region.key,
      label: region.label,
      regnCode,
      regnName: pickField(hit.item, LDONG_NAME_KEYS),
      regnMatchedBy: hit.matchedBy,
      signguCode: null,
      signguName: null,
      signguMatchedBy: null,
      entries: [],
      sampleItemKeys: Object.keys(hit.item),
      error: null,
    };

    if (!regnCode) {
      entry.error = `시도 코드 필드를 찾지 못함 (아이템 키: ${Object.keys(hit.item).join(", ")})`;
      resolved.push(entry);
      continue;
    }

    let cached = sigunguCache.get(regnCode);
    if (!cached) {
      const sgRes = await callTourApi(
        base,
        "ldongCode2",
        { lDongRegnCd: regnCode, numOfRows: LDONG_ROWS },
        { label: `${service}:ldongCode2(시군구/${region.key})`, service, regionKey: region.key }
      );
      await sleep(CALL_DELAY_MS);

      cached = sgRes.ok
        ? {
            entries: sgRes.items
              .map((it) => ({ code: pickField(it, LDONG_CODE_KEYS), name: pickField(it, LDONG_NAME_KEYS) ?? "" }))
              .filter((e) => e.name !== ""),
            keys: sgRes.items[0] ? Object.keys(sgRes.items[0]) : [],
            error: null,
          }
        : { entries: [], keys: [], error: sgRes.error };
      sigunguCache.set(regnCode, cached);
    }

    entry.entries = cached.entries;
    if (cached.keys.length > 0) entry.sampleItemKeys = cached.keys;
    if (cached.error) entry.error = `시군구 조회 실패: ${cached.error}`;

    const sigunguNames = service === "kor" ? region.sigunguNamesKo : region.sigunguNamesEn;
    if (sigunguNames && cached.entries.length > 0) {
      const sgHit = findByNames(cached.entries, (e) => e.name, sigunguNames);
      if (sgHit) {
        entry.signguCode = sgHit.item.code;
        entry.signguName = sgHit.item.name;
        entry.signguMatchedBy = sgHit.matchedBy;
      } else {
        entry.error = `법정동 시군구 이름 매칭 실패 (후보: ${sigunguNames.join(", ")})`;
      }
    }

    resolved.push(entry);
  }

  return resolved;
}

/** 모드별 조회 파라미터. 해석 실패면 null */
function filterParams(
  mode: FilterMode,
  area: ResolvedArea,
  ldong: ResolvedLdong
): Record<string, string> | null {
  if (mode === "area") {
    if (!area.areaCode) return null;
    const p: Record<string, string> = { areaCode: area.areaCode };
    if (area.sigunguCode) p.sigunguCode = area.sigunguCode;
    return p;
  }
  if (!ldong.regnCode) return null;
  const p: Record<string, string> = { lDongRegnCd: ldong.regnCode };
  if (ldong.signguCode) p.lDongSignguCd = ldong.signguCode;
  return p;
}

function paramsLabel(p: Record<string, string> | null): string {
  if (!p) return "-";
  return Object.entries(p)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

function resolveError(mode: FilterMode, area: ResolvedArea, ldong: ResolvedLdong): string {
  return (mode === "area" ? area.error : ldong.error) ?? "지역 코드 미해석";
}

// ─── M1: 우리 Area vs ldongCode2 시군구 목록 ──────────────────────────────────

function buildM1(ldong: ResolvedLdong, ourAreas: OurArea[], service: ServiceKind): M1RegionResult {
  const rows: AreaMatchRow[] = [];
  const usedTourNames = new Set<string>();

  for (const area of ourAreas) {
    // 국문 서비스는 nameKo, 영문 서비스는 nameEn과 비교
    const ourName = service === "kor" ? area.nameKo : area.nameEn;
    if (!ourName) {
      rows.push({
        areaId: area.id,
        areaName: `${area.nameKo} (nameEn 없음)`,
        matchedTourName: null,
        matchedBy: null,
      });
      continue;
    }
    const hit = findByNames(ldong.entries, (e) => e.name, [ourName]);
    if (hit) usedTourNames.add(hit.item.name);
    rows.push({
      areaId: area.id,
      areaName: ourName,
      matchedTourName: hit ? hit.item.name : null,
      matchedBy: hit ? hit.matchedBy : null,
    });
  }

  return {
    regionKey: ldong.regionKey,
    label: ldong.label,
    regnCode: ldong.regnCode,
    regnName: ldong.regnName,
    tourSigunguCount: ldong.entries.length,
    sampleItemKeys: ldong.sampleItemKeys,
    error: ldong.error,
    ourAreaCount: ourAreas.length,
    matchedCount: rows.filter((r) => r.matchedTourName !== null).length,
    unmatchedOurAreas: rows.filter((r) => r.matchedTourName === null).map((r) => r.areaName),
    unmatchedTourNames: ldong.entries.map((e) => e.name).filter((n) => !usedTourNames.has(n)),
    rows,
  };
}

// ─── M2: areaBasedList2 ───────────────────────────────────────────────────────

async function runAreaBased(
  base: string,
  service: ServiceKind,
  region: RegionSpec,
  mode: FilterMode,
  params: Record<string, string> | null,
  errorIfNoParams: string
): Promise<M2RegionResult> {
  if (!params) {
    return {
      regionKey: region.key,
      label: region.label,
      mode,
      params: null,
      ok: false,
      error: errorIfNoParams,
      totalCount: null,
      sampleSize: 0,
      withImage: 0,
      withCoord: 0,
      elapsedMs: 0,
    };
  }

  const res = await callTourApi(
    base,
    "areaBasedList2",
    { ...params, numOfRows: AREA_SAMPLE_ROWS, arrange: "A" },
    { label: `${service}:areaBasedList2/${region.key}/${mode}`, service, regionKey: region.key }
  );
  await sleep(CALL_DELAY_MS);

  return {
    regionKey: region.key,
    label: region.label,
    mode,
    params,
    ok: res.ok,
    error: res.error,
    totalCount: res.totalCount,
    sampleSize: res.items.length,
    withImage: res.items.filter(hasImage).length,
    withCoord: res.items.filter(hasCoord).length,
    elapsedMs: res.elapsedMs,
  };
}

// ─── M3: searchStay2 ──────────────────────────────────────────────────────────

async function runStay(
  base: string,
  service: ServiceKind,
  region: RegionSpec,
  mode: FilterMode,
  params: Record<string, string> | null,
  errorIfNoParams: string
): Promise<M3RegionResult> {
  if (!params) {
    return {
      regionKey: region.key,
      label: region.label,
      mode,
      params: null,
      ok: false,
      error: errorIfNoParams,
      totalCount: null,
      topNames: [],
      elapsedMs: 0,
    };
  }

  const res = await callTourApi(
    base,
    "searchStay2",
    { ...params, numOfRows: STAY_TOP_N, arrange: "A" },
    { label: `${service}:searchStay2/${region.key}/${mode}`, service, regionKey: region.key }
  );
  await sleep(CALL_DELAY_MS);

  return {
    regionKey: region.key,
    label: region.label,
    mode,
    params,
    ok: res.ok,
    error: res.error,
    totalCount: res.totalCount,
    topNames: res.items.slice(0, STAY_TOP_N).map((it) => (it.title ?? "").trim()).filter(Boolean),
    elapsedMs: res.elapsedMs,
  };
}

// ─── M4: searchFestival2 (오늘 기준 진행중) ───────────────────────────────────

/**
 * searchFestival2는 eventStartDate 이후 시작하는 축제를 돌려준다.
 * "오늘 진행중"을 세려면 과거에 시작해 아직 안 끝난 것도 포함해야 하므로,
 * lookback 만큼 거슬러 올라가 받은 뒤 eventstartdate <= 오늘 <= eventenddate로 직접 거른다.
 */
async function runFestival(
  base: string,
  service: ServiceKind,
  region: RegionSpec,
  mode: FilterMode,
  params: Record<string, string> | null,
  errorIfNoParams: string,
  todayStr: string,
  lookbackStr: string
): Promise<M4RegionResult> {
  if (!params) {
    return {
      regionKey: region.key,
      label: region.label,
      mode,
      params: null,
      ok: false,
      error: errorIfNoParams,
      totalCount: null,
      fetchedCount: 0,
      ongoingCount: 0,
      undatedCount: 0,
      truncated: false,
      elapsedMs: 0,
    };
  }

  const collected: TourItem[] = [];
  let totalCount: number | null = null;
  let elapsedMs = 0;
  let truncated = false;
  let error: string | null = null;
  let ok = true;

  for (let page = 1; page <= FESTIVAL_MAX_PAGES; page++) {
    const res = await callTourApi(
      base,
      "searchFestival2",
      { ...params, eventStartDate: lookbackStr, numOfRows: FESTIVAL_ROWS, pageNo: page, arrange: "A" },
      { label: `${service}:searchFestival2/${region.key}/${mode}/p${page}`, service, regionKey: region.key }
    );
    await sleep(CALL_DELAY_MS);

    elapsedMs += res.elapsedMs;

    if (!res.ok) {
      ok = false;
      error = res.error;
      break;
    }

    if (page === 1) totalCount = res.totalCount;
    collected.push(...res.items);

    if (res.items.length < FESTIVAL_ROWS) break;
    if (page === FESTIVAL_MAX_PAGES && totalCount !== null && collected.length < totalCount) {
      truncated = true;
    }
  }

  let ongoingCount = 0;
  let undatedCount = 0;
  for (const it of collected) {
    const start = (it.eventstartdate ?? "").trim();
    const end = (it.eventenddate ?? "").trim();
    if (!/^\d{8}$/.test(start) || !/^\d{8}$/.test(end)) {
      undatedCount++;
      continue;
    }
    if (start <= todayStr && todayStr <= end) ongoingCount++;
  }

  return {
    regionKey: region.key,
    label: region.label,
    mode,
    params,
    ok,
    error,
    totalCount,
    fetchedCount: collected.length,
    ongoingCount,
    undatedCount,
    truncated,
    elapsedMs,
  };
}

// ─── M5: locationBasedList2 ───────────────────────────────────────────────────

async function runLocationBased(
  base: string,
  service: ServiceKind,
  region: RegionSpec
): Promise<M5RegionResult> {
  if (!region.center) {
    return {
      regionKey: region.key,
      label: region.label,
      ok: false,
      error: "중심좌표 미정의 (대상 아님)",
      center: null,
      totalCount: null,
      elapsedMs: 0,
    };
  }

  // totalCount만 필요하므로 numOfRows=1로 최소 수신
  const res = await callTourApi(
    base,
    "locationBasedList2",
    { mapX: region.center.lng, mapY: region.center.lat, radius: RADIUS_M, numOfRows: 1, arrange: "S" },
    { label: `${service}:locationBasedList2/${region.key}`, service, regionKey: region.key }
  );
  await sleep(CALL_DELAY_MS);

  return {
    regionKey: region.key,
    label: region.label,
    ok: res.ok,
    error: res.error,
    center: region.center,
    totalCount: res.totalCount,
    elapsedMs: res.elapsedMs,
  };
}

// ─── 서비스 1개 전체 실행 ─────────────────────────────────────────────────────

async function runService(
  base: string,
  service: ServiceKind,
  ourAreasByRegion: Record<string, OurArea[]>,
  todayStr: string,
  lookbackStr: string
): Promise<ServiceReport> {
  const serviceLabel = service === "kor" ? "KorService2" : "EngService2";
  console.log(`\n${"═".repeat(78)}`);
  console.log(`  ${serviceLabel}  (${base})`);
  console.log("═".repeat(78));

  console.log("▶ areaCode2 조회 중...");
  const areaResolution = await resolveAreaCodes(base, service);
  const areaByKey = new Map(areaResolution.map((r) => [r.regionKey, r]));

  console.log("▶ ldongCode2 조회 중...");
  const ldongResolution = await resolveLdongCodes(base, service);
  const ldongByKey = new Map(ldongResolution.map((r) => [r.regionKey, r]));

  // M1 — 서울·부산만
  const m1: M1RegionResult[] = [];
  for (const region of REGIONS) {
    if (!region.compareOurAreas) continue;
    m1.push(buildM1(ldongByKey.get(region.key)!, ourAreasByRegion[region.key] ?? [], service));
  }

  const m2: M2RegionResult[] = [];
  const m3: M3RegionResult[] = [];
  const m4: M4RegionResult[] = [];

  console.log("▶ areaBasedList2 / searchStay2 / searchFestival2 조회 중 (두 코드 체계 각각)...");
  for (const region of REGIONS) {
    const area = areaByKey.get(region.key)!;
    const ldong = ldongByKey.get(region.key)!;
    for (const mode of FILTER_MODES) {
      const params = filterParams(mode, area, ldong);
      const errMsg = resolveError(mode, area, ldong);
      m2.push(await runAreaBased(base, service, region, mode, params, errMsg));
      m3.push(await runStay(base, service, region, mode, params, errMsg));
      m4.push(await runFestival(base, service, region, mode, params, errMsg, todayStr, lookbackStr));
    }
  }

  console.log("▶ locationBasedList2 조회 중...");
  const m5: M5RegionResult[] = [];
  for (const region of REGIONS) {
    if (!region.center) continue;
    m5.push(await runLocationBased(base, service, region));
  }

  return { service, base, areaResolution, ldongResolution, m1, m2, m3, m4, m5 };
}

// ─── 출력 ─────────────────────────────────────────────────────────────────────

function printServiceReport(report: ServiceReport, todayStr: string, lookbackStr: string): void {
  const serviceLabel = report.service === "kor" ? "KorService2 (국문)" : "EngService2 (영문)";
  console.log(`\n${"━".repeat(78)}`);
  console.log(`  ■ ${serviceLabel}`);
  console.log("━".repeat(78));

  // 0. 코드 해석 결과
  console.log("\n【0】 지역 코드 실제 조회 결과 (추정값 대조 + 두 코드 체계)");
  const ldongByKey = new Map(report.ldongResolution.map((r) => [r.regionKey, r]));
  renderTable(
    ["지역", "추정", "areaCode", "이름", "sigunguCode", "판정", "lDongRegnCd", "lDongSignguCd", "법정동명"],
    report.areaResolution.map((r) => {
      const l = ldongByKey.get(r.regionKey);
      return [
        r.label,
        String(r.guessedAreaCode),
        r.areaCode ?? "-",
        r.areaName ?? "-",
        r.sigunguCode ?? "-",
        r.guessVerdict,
        l?.regnCode ?? "-",
        l?.signguCode ?? "-",
        l?.signguName ?? l?.regnName ?? "-",
      ];
    })
  );
  for (const r of report.areaResolution) if (r.error) console.log(`  ⚠️  [areaCode] ${r.label}: ${r.error}`);
  for (const r of report.ldongResolution) if (r.error) console.log(`  ⚠️  [lDong] ${r.label}: ${r.error}`);

  // 1. ldongCode2 vs 우리 Area
  console.log("\n【1】 ldongCode2 — 시군구 목록 vs 우리 Area 이름");
  if (report.m1.length === 0) console.log("  (대상 없음)");
  for (const r of report.m1) {
    console.log(`\n  ── ${r.label} ──`);
    if (r.error) {
      console.log(`  ⚠️  ${r.error}`);
      if (r.sampleItemKeys.length > 0) console.log(`     응답 아이템 키: ${r.sampleItemKeys.join(", ")}`);
      if (r.tourSigunguCount === 0) continue;
    }
    console.log(
      `  법정동 시도코드 ${r.regnCode ?? "-"} (${r.regnName ?? "-"}) / TourAPI 시군구 ${r.tourSigunguCount}개 / 우리 Area ${r.ourAreaCount}개`
    );
    console.log(`  매칭: ${r.matchedCount}/${r.ourAreaCount} (${pct(r.matchedCount, r.ourAreaCount)})`);
    if (r.sampleItemKeys.length > 0) console.log(`  응답 아이템 키: ${r.sampleItemKeys.join(", ")}`);
    renderTable(
      ["우리 Area", "TourAPI 시군구", "매칭"],
      r.rows.map((row) => [row.areaName, row.matchedTourName ?? "✗ 없음", row.matchedBy ?? "-"]),
      "    "
    );
    if (r.unmatchedTourNames.length > 0) {
      console.log(`    TourAPI에만 있는 시군구 (${r.unmatchedTourNames.length}개): ${r.unmatchedTourNames.join(", ")}`);
    }
  }

  // 2. areaBasedList2
  console.log(`\n【2】 areaBasedList2 — 지역별 총 건수 / 이미지·좌표 보유율 (표본 ${AREA_SAMPLE_ROWS}건)`);
  renderTable(
    ["지역", "필터", "총 건수", "표본", "이미지", "이미지%", "좌표", "좌표%", "ms"],
    report.m2.map((r) =>
      r.ok
        ? [
            r.label,
            MODE_LABEL[r.mode],
            num(r.totalCount),
            String(r.sampleSize),
            String(r.withImage),
            pct(r.withImage, r.sampleSize),
            String(r.withCoord),
            pct(r.withCoord, r.sampleSize),
            String(r.elapsedMs),
          ]
        : [r.label, MODE_LABEL[r.mode], "실패", "-", "-", "-", "-", "-", String(r.elapsedMs)]
    )
  );
  printModeGap(report.m2.map((r) => ({ label: r.label, mode: r.mode, total: r.ok ? r.totalCount : null })));
  for (const r of report.m2) if (!r.ok) console.log(`  ⚠️  ${r.label}/${MODE_LABEL[r.mode]}: ${r.error}`);

  // 3. searchStay2
  console.log("\n【3】 searchStay2 — 지역별 숙박 총 건수 + 상위 5개");
  renderTable(
    ["지역", "필터", "총 건수", "ms"],
    report.m3.map((r) => [r.label, MODE_LABEL[r.mode], r.ok ? num(r.totalCount) : "실패", String(r.elapsedMs)])
  );
  printModeGap(report.m3.map((r) => ({ label: r.label, mode: r.mode, total: r.ok ? r.totalCount : null })));
  console.log("");
  for (const r of report.m3) {
    if (!r.ok) {
      console.log(`  ⚠️  ${r.label}/${MODE_LABEL[r.mode]}: ${r.error}`);
      continue;
    }
    console.log(`    ${r.label} [${MODE_LABEL[r.mode]}]: ${r.topNames.length > 0 ? r.topNames.join(" / ") : "(결과 없음)"}`);
  }

  // 4. searchFestival2
  console.log(`\n【4】 searchFestival2 — 오늘(${todayStr}) 기준 진행중 축제`);
  console.log(`     조회 범위: eventStartDate=${lookbackStr} 이후, 최대 ${FESTIVAL_MAX_PAGES}페이지 × ${FESTIVAL_ROWS}건`);
  console.log("     '진행중' = eventstartdate ≤ 오늘 ≤ eventenddate (클라이언트 필터)");
  renderTable(
    ["지역", "필터", "진행중", "수신", "API 총건수", "날짜없음", "잘림", "ms"],
    report.m4.map((r) =>
      r.ok
        ? [
            r.label,
            MODE_LABEL[r.mode],
            String(r.ongoingCount),
            String(r.fetchedCount),
            num(r.totalCount),
            String(r.undatedCount),
            r.truncated ? "⚠️ 예" : "아니오",
            String(r.elapsedMs),
          ]
        : [r.label, MODE_LABEL[r.mode], "실패", "-", "-", "-", "-", String(r.elapsedMs)]
    )
  );
  for (const r of report.m4) if (!r.ok) console.log(`  ⚠️  ${r.label}/${MODE_LABEL[r.mode]}: ${r.error}`);

  // 5. locationBasedList2
  console.log(`\n【5】 locationBasedList2 — 중심좌표 반경 ${RADIUS_M / 1000}km 건수 (지역 필터 없음)`);
  renderTable(
    ["지역", "중심좌표", "기준점", "건수", "ms"],
    report.m5.map((r) => [
      r.label,
      r.center ? `${r.center.lat}, ${r.center.lng}` : "-",
      r.center?.note ?? "-",
      r.ok ? num(r.totalCount) : "실패",
      String(r.elapsedMs),
    ])
  );
  for (const r of report.m5) if (!r.ok) console.log(`  ⚠️  ${r.label}: ${r.error}`);
}

/** 두 코드 체계 간 총건수 격차를 한 줄로 요약 */
function printModeGap(rows: { label: string; mode: FilterMode; total: number | null }[]): void {
  const byLabel = new Map<string, Partial<Record<FilterMode, number | null>>>();
  for (const r of rows) {
    const cur = byLabel.get(r.label) ?? {};
    cur[r.mode] = r.total;
    byLabel.set(r.label, cur);
  }
  const parts: string[] = [];
  for (const [label, v] of byLabel) {
    const a = v.area ?? null;
    const l = v.ldong ?? null;
    if (a === null || l === null) continue;
    const ratio = a === 0 ? (l === 0 ? "—" : "∞") : `${(l / a).toFixed(1)}×`;
    parts.push(`${label} ${ratio}`);
  }
  if (parts.length > 0) console.log(`  → lDong / areaCode 배율: ${parts.join(" · ")}`);
}

function printLatency(): void {
  console.log(`\n${"━".repeat(78)}`);
  console.log("  ■ 응답시간 요약");
  console.log("━".repeat(78));

  const okTimings = timings.filter((t) => t.ok);
  const all = okTimings.map((t) => t.elapsedMs).sort((a, b) => a - b);

  console.log(`\n  전체 성공 호출 ${all.length}회 / 실패 ${timings.length - all.length}회`);
  if (all.length > 0) {
    console.log(
      `  p50 ${percentile(all, 50)}ms / p95 ${percentile(all, 95)}ms / max ${all[all.length - 1]}ms / min ${all[0]}ms`
    );
  }

  const groups = new Map<string, number[]>();
  for (const t of okTimings) {
    const key = `${t.service}:${t.endpoint}`;
    const arr = groups.get(key) ?? [];
    arr.push(t.elapsedMs);
    groups.set(key, arr);
  }

  const rows = [...groups.entries()]
    .map(([key, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
      return [
        key,
        String(sorted.length),
        String(avg),
        String(percentile(sorted, 50)),
        String(percentile(sorted, 95)),
        String(sorted[sorted.length - 1]),
      ];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  console.log("");
  renderTable(["서비스:엔드포인트", "호출수", "평균", "p50", "p95", "max"], rows);
}

function printCallSummary(): void {
  console.log(`\n${"━".repeat(78)}`);
  console.log("  ■ 호출 집계");
  console.log("━".repeat(78));
  console.log(`\n  총 호출: ${totalCalls}회 / 실패: ${callFailures.length}회`);
  if (callFailures.length > 0) {
    console.log("  ── 실패 목록 (최대 20건) ──");
    for (const f of callFailures.slice(0, 20)) {
      console.log(`    [${f.service}] ${f.label} — ${f.reason}`);
    }
    if (callFailures.length > 20) {
      console.log(`    ... 외 ${callFailures.length - 20}건 (전체는 결과 JSON 참조)`);
    }
  }
}

// ─── 우리 Area 조회 (READ-ONLY) ───────────────────────────────────────────────

/** 서울·부산 아래의 level=1 Area를 지역 키별로 묶는다 */
async function fetchOurAreas(prisma: PrismaClient): Promise<Record<string, OurArea[]>> {
  const areas = await prisma.area.findMany({
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      level: true,
      parent: { select: { id: true, nameKo: true, nameEn: true } },
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });

  const byRegion: Record<string, OurArea[]> = {};
  for (const region of REGIONS) {
    if (!region.compareOurAreas) continue;
    byRegion[region.key] = areas.filter(
      (a) =>
        a.level === 1 &&
        a.parent !== null &&
        findByNames([a.parent], (p) => p.nameKo, region.sidoNamesKo) !== null
    );
  }
  return byRegion;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.error("❌ TOUR_API_KEY가 없습니다.");
    console.error("");
    console.error("   공공데이터포털의 '디코딩(Decoding)' 키를 넣어 주세요. 인코딩키가 아닙니다.");
    console.error("   실행 예:");
    console.error(
      "     TOUR_API_KEY=\"<디코딩키>\" npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/scripts/tour-api-spike-2.ts"
    );
    console.error("   또는 .env.local에 TOUR_API_KEY=... 추가");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL이 없습니다. .env.local을 확인해 주세요.");
    console.error("   (M1의 우리 Area 비교에만 사용합니다.)");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const startedAt = new Date();
  const todayStr = yyyymmdd(startedAt);
  const lookbackStr = yyyymmdd(new Date(startedAt.getTime() - FESTIVAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));

  try {
    console.log("📍 우리 Area 조회 중... (READ-ONLY)");
    const ourAreasByRegion = await fetchOurAreas(prisma);
    for (const [key, list] of Object.entries(ourAreasByRegion)) {
      const region = REGIONS.find((r) => r.key === key);
      console.log(`   ${region?.label ?? key}: level=1 Area ${list.length}건`);
    }

    const korReport = await runService(KOR_BASE, "kor", ourAreasByRegion, todayStr, lookbackStr);
    const engReport = await runService(ENG_BASE, "eng", ourAreasByRegion, todayStr, lookbackStr);

    printServiceReport(korReport, todayStr, lookbackStr);
    printServiceReport(engReport, todayStr, lookbackStr);
    printLatency();
    printCallSummary();

    const payload = {
      meta: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        todayStr,
        festivalLookbackStr: lookbackStr,
        korBase: KOR_BASE,
        engBase: ENG_BASE,
        regions: REGIONS.map((r) => ({
          key: r.key,
          label: r.label,
          guessedAreaCode: r.guessedAreaCode,
          center: r.center,
        })),
        params: {
          areaSampleRows: AREA_SAMPLE_ROWS,
          stayTopN: STAY_TOP_N,
          festivalLookbackDays: FESTIVAL_LOOKBACK_DAYS,
          festivalRows: FESTIVAL_ROWS,
          festivalMaxPages: FESTIVAL_MAX_PAGES,
          radiusM: RADIUS_M,
        },
        notes: [
          "지역 코드는 areaCode2 / ldongCode2로 실제 조회해 이름 매칭으로 해석했다. guessedAreaCode는 대조용 추정값일 뿐 조회에 쓰이지 않았다.",
          "지역 필터 코드 체계가 두 벌이라 M2~M4를 areaCode/sigunguCode(구 관광지역 코드)와 lDongRegnCd/lDongSignguCd(법정동 코드)로 각각 조회했다. 같은 지역이라도 결과가 크게 다르다.",
          "searchFestival2는 최근 레코드의 areacode 필드가 빈 값이라 areaCode 필터로는 0건이 나온다. 실질 수치는 lDong 쪽을 봐야 한다.",
          "M2의 이미지·좌표 보유율은 전체가 아니라 첫 페이지 표본(numOfRows=" + AREA_SAMPLE_ROWS + ") 기준이다.",
          "M4의 '진행중'은 API 필터가 아니라 수신한 아이템을 eventstartdate/eventenddate로 직접 거른 결과다. truncated=true면 과소집계일 수 있다.",
          "M5 중심좌표는 Area 모델에 좌표 컬럼이 없어 스크립트에 직접 적어둔 값이다(행정구역 중심이 아닌 관광 중심지 기준). locationBasedList2는 지역 코드 필터를 쓰지 않는다.",
          "DB는 area.findMany만 사용한 READ-ONLY 스파이크.",
        ],
      },
      ourAreas: ourAreasByRegion,
      kor: korReport,
      eng: engReport,
      timings,
      callFailures,
      totalCalls,
    };

    fs.writeFileSync(RESULT_PATH, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`\n💾 원본 결과 저장: ${RESULT_PATH}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n❌ 스파이크 중단:", e);
  process.exit(1);
});
