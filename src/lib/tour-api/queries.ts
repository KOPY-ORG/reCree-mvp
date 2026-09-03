// ─── TourAPI 기능별 조회 ──────────────────────────────────────────────────────
// 공개 함수 4개. 전부 실패 시 null을 반환하고 throw하지 않는다.
// 지역 필터는 법정동 코드(lDongRegnCd/lDongSignguCd)만 쓴다 — areaCode는 과소집계한다.

import { callTourApi, pickField } from "./client";
import type { Attraction, Festival, LdongCode, TourItem, TourLang, TourResult } from "./types";

/** ldongCode2 응답 필드명 후보. 실측상 areaCode2와 같은 code/name으로 내려오나 문서와 다를 수 있다 */
const LDONG_CODE_KEYS = ["code", "lDongRegnCd", "lDongSignguCd", "ldongRegnCd", "ldongSignguCd"];
const LDONG_NAME_KEYS = ["name", "lDongRegnNm", "lDongSignguNm", "ldongRegnNm", "ldongSignguNm"];

/** 축제 조회 시 거슬러 올라갈 일수 — 이미 시작한 장기 축제를 놓치지 않기 위함 */
const FESTIVAL_LOOKBACK_DAYS = 180;
const FESTIVAL_ROWS = 100;
const FESTIVAL_MAX_PAGES = 3;

const DEFAULT_LIMIT = 20;
const DEFAULT_UPCOMING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

/** YYYYMMDD */
function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** "20260915" → 로컬 자정 Date. 형식이 아니면 null */
function parseYmd(s: string): Date | null {
  if (!/^\d{8}$/.test(s)) return null;
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** 0이거나 숫자가 아니면 null — 좌표 미입력 레코드가 0,0으로 내려온다 */
function toCoord(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function toAddress(item: TourItem): string | null {
  const parts = [item.addr1, item.addr2]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function toImageUrl(item: TourItem): string | null {
  return pickField(item, ["firstimage", "firstimage2"]);
}

/** 지역 필터 파라미터. signguCd는 있을 때만 붙인다 */
function ldongParams(regnCd: string, signguCd?: string): Record<string, string> {
  const p: Record<string, string> = { lDongRegnCd: regnCd };
  if (signguCd) p.lDongSignguCd = signguCd;
  return p;
}

function toAttraction(item: TourItem): Attraction | null {
  const contentId = pickField(item, ["contentid"]);
  const title = pickField(item, ["title"]);
  if (!contentId || !title) return null;

  const dist = pickField(item, ["dist"]);
  const distNum = dist === null ? NaN : Number(dist);

  return {
    contentId,
    title,
    address: toAddress(item),
    lat: toCoord(pickField(item, ["mapy"])),
    lng: toCoord(pickField(item, ["mapx"])),
    imageUrl: toImageUrl(item),
    distanceM: Number.isFinite(distNum) ? Math.round(distNum) : null,
    contentTypeId: pickField(item, ["contenttypeid"]),
  };
}

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

/** 좌표 반경 내 관광지. 거리순 */
export async function getNearbyAttractions({
  lat,
  lng,
  radiusM,
  lang,
  limit = DEFAULT_LIMIT,
}: {
  lat: number;
  lng: number;
  radiusM: number;
  lang: TourLang;
  limit?: number;
}): Promise<TourResult<Attraction> | null> {
  const res = await callTourApi(lang, "locationBasedList2", {
    mapX: lng,
    mapY: lat,
    radius: radiusM,
    numOfRows: limit,
    arrange: "S",
  });
  if (!res.ok) return null;

  return {
    items: res.items.map(toAttraction).filter((a): a is Attraction => a !== null),
    totalCount: res.totalCount,
  };
}

/** 법정동 코드 기준 관광지 */
export async function getAreaAttractions({
  regnCd,
  signguCd,
  lang,
  limit = DEFAULT_LIMIT,
}: {
  regnCd: string;
  signguCd?: string;
  lang: TourLang;
  limit?: number;
}): Promise<TourResult<Attraction> | null> {
  const res = await callTourApi(lang, "areaBasedList2", {
    ...ldongParams(regnCd, signguCd),
    numOfRows: limit,
    arrange: "A",
  });
  if (!res.ok) return null;

  return {
    items: res.items.map(toAttraction).filter((a): a is Attraction => a !== null),
    totalCount: res.totalCount,
  };
}

/**
 * 법정동 코드 기준 축제. 진행중 + upcomingDays 이내 시작 예정만.
 *
 * searchFestival2는 eventStartDate 이후 "시작하는" 축제를 돌려주므로, 이미 시작해
 * 아직 안 끝난 것을 잡으려면 과거로 거슬러 받은 뒤 직접 걸러야 한다.
 */
export async function getFestivals({
  regnCd,
  signguCd,
  lang,
  upcomingDays = DEFAULT_UPCOMING_DAYS,
}: {
  regnCd: string;
  signguCd?: string;
  lang: TourLang;
  upcomingDays?: number;
}): Promise<TourResult<Festival> | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = yyyymmdd(today);
  const lookbackStr = yyyymmdd(new Date(today.getTime() - FESTIVAL_LOOKBACK_DAYS * DAY_MS));
  const params = ldongParams(regnCd, signguCd);

  const collected: TourItem[] = [];
  for (let page = 1; page <= FESTIVAL_MAX_PAGES; page++) {
    const res = await callTourApi(lang, "searchFestival2", {
      ...params,
      eventStartDate: lookbackStr,
      numOfRows: FESTIVAL_ROWS,
      pageNo: page,
      arrange: "A",
    });
    // 첫 페이지가 실패하면 결과 없음, 이후 페이지 실패는 받은 만큼만 쓴다
    if (!res.ok) {
      if (page === 1) return null;
      break;
    }
    collected.push(...res.items);
    if (res.items.length < FESTIVAL_ROWS) break;
  }

  const items: Festival[] = [];
  for (const item of collected) {
    const contentId = pickField(item, ["contentid"]);
    const title = pickField(item, ["title"]);
    if (!contentId || !title) continue;

    const startDate = (item.eventstartdate ?? "").trim();
    const endDate = (item.eventenddate ?? "").trim();
    const start = parseYmd(startDate);
    const end = parseYmd(endDate);
    if (!start || !end) continue;

    if (endDate < todayStr) continue; // 이미 끝남

    const daysUntilStart = daysBetween(today, start);
    const daysUntilEnd = daysBetween(today, end);

    let status: Festival["status"];
    if (startDate <= todayStr && todayStr <= endDate) {
      status = "ongoing";
    } else if (startDate > todayStr && daysUntilStart <= upcomingDays) {
      status = "upcoming";
    } else {
      continue;
    }

    items.push({
      contentId,
      title,
      address: toAddress(item),
      lat: toCoord(pickField(item, ["mapy"])),
      lng: toCoord(pickField(item, ["mapx"])),
      imageUrl: toImageUrl(item),
      startDate,
      endDate,
      status,
      daysUntilStart,
      daysUntilEnd,
    });
  }

  // ongoing 먼저, 그다음 startDate 오름차순
  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
    return a.startDate.localeCompare(b.startDate);
  });

  // API의 totalCount는 lookback 범위 전체(끝난 축제 포함) 건수라 필터 결과와 맞지 않는다
  return { items, totalCount: items.length };
}

/** 법정동 코드 목록. regnCd 없으면 시도, 있으면 그 시도의 시군구 */
export async function getLdongCodes({
  regnCd,
  lang,
}: {
  regnCd?: string;
  lang: TourLang;
}): Promise<TourResult<LdongCode> | null> {
  const res = await callTourApi(lang, "ldongCode2", {
    ...(regnCd ? { lDongRegnCd: regnCd } : {}),
    numOfRows: 200,
  });
  if (!res.ok) return null;

  const items: LdongCode[] = [];
  for (const item of res.items) {
    const code = pickField(item, LDONG_CODE_KEYS);
    const name = pickField(item, LDONG_NAME_KEYS);
    if (!code || !name) continue;
    items.push({ code, name });
  }

  return { items, totalCount: res.totalCount };
}
