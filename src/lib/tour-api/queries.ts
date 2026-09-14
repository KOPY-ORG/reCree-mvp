// ─── TourAPI 기능별 조회 ──────────────────────────────────────────────────────
// 공개 함수 4개. 전부 실패 시 null을 반환하고 throw하지 않는다.
// 지역 필터는 법정동 코드(lDongRegnCd/lDongSignguCd)만 쓴다 — areaCode는 과소집계한다.

import { callTourApi, pickField } from "./client";
import { koreanKey, splitBilingualTitle } from "./title";
import { translateKoToEn } from "./translate";
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

/**
 * 영문 결과가 이 수에 못 미치면 국문으로 채운다.
 *
 * 영문 DB 는 국문의 일부만 담고 있고 지방으로 갈수록 격차가 커진다
 * (법정동 기준 실측 — 서울 8,005 대 4,972, 경주 622 대 102, 강릉 1,003 대 113).
 * 영문만 쓰면 지방에서 목록이 서너 줄로 비는데, 번역해서라도 보여주는 편이 낫다.
 */
const KO_BACKFILL_THRESHOLD = 10;

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
    // 언어에 상관없이 원문을 그대로 담아 둔다. 언어별 처리는 아래 두 함수가 한다
    titleKo: null,
    address: toAddress(item),
    lat: toCoord(pickField(item, ["mapy"])),
    lng: toCoord(pickField(item, ["mapx"])),
    imageUrl: toImageUrl(item),
    distanceM: Number.isFinite(distNum) ? Math.round(distNum) : null,
    contentTypeId: pickField(item, ["contenttypeid"]),
  };
}

// ─── 국문 보강 ────────────────────────────────────────────────────────────────

/** title / titleKo / address 를 갖는 것이면 관광지든 축제든 아래 두 함수를 그대로 쓴다 */
type Bilingual = {
  contentId: string;
  title: string;
  titleKo: string | null;
  address: string | null;
};

/** 영문 응답 — "영문 (한글)" 을 쪼개기만 한다. 번역 호출이 없다 */
function splitEnglish<T extends Bilingual>(items: T[]): T[] {
  return items.map((item) => {
    const { titleEn, titleKo } = splitBilingualTitle(item.title);
    return { ...item, title: titleEn, titleKo };
  });
}

/**
 * 국문 응답 — 번역해서 영문을 채운다. titleKo 가 원문, title 이 번역 결과다.
 * 영문 경로와 필드 의미가 같아진다.
 *
 * 번역이 실패한 항목은 title 에 국문이 그대로 남는다. 호출 횟수는 항목 수와 무관하다 —
 * 제목·주소를 전부 한 맵에 담아 한 번에 보낸다.
 */
async function fillFromKorean<T extends Bilingual>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;

  const values: Record<string, string> = {};
  for (const item of items) {
    values[`${item.contentId}:title`] = item.title;
    if (item.address) values[`${item.contentId}:address`] = item.address;
  }

  const translated = await translateKoToEn(values);

  return items.map((item) => ({
    ...item,
    titleKo: item.title,
    title: translated[`${item.contentId}:title`] ?? item.title,
    address:
      item.address === null
        ? null
        : translated[`${item.contentId}:address`] ?? item.address,
  }));
}

/**
 * 영문 우선, 모자라면 국문으로 채운다. fetch 는 같은 조회를 언어만 바꿔 두 번 수행한다.
 *
 * 합칠 때 contentId 로는 중복을 못 거른다 — 영문과 국문은 id 공간이 완전히 분리돼 있다
 * (실측 교집합 0건). 정규화한 국문 제목을 키로 쓴다 (title.ts 의 koreanKey).
 *
 * 영문을 앞에 두고 국문을 뒤에 붙인다. 거리순으로 다시 정렬하지 않는다 —
 * 화면에 거리를 표시하지 않으므로, 읽을 수 있는 줄이 위에 오는 편이 낫다.
 */
async function withKoreanBackfill(
  fetch: (lang: TourLang) => Promise<TourResult<Attraction> | null>,
  limit: number
): Promise<TourResult<Attraction> | null> {
  const en = await fetch("en");
  const enItems = en === null ? [] : splitEnglish(en.items);

  if (enItems.length >= KO_BACKFILL_THRESHOLD) {
    return { items: enItems, totalCount: en?.totalCount ?? enItems.length };
  }

  // 영문이 죽었어도(en === null) 국문은 시도한다. 0건은 임계치 미만이라 같은 길로 온다
  const ko = await fetch("ko");
  if (ko === null) {
    // 둘 다 죽었을 때만 섹션을 죽인다
    return en === null ? null : { items: enItems, totalCount: en.totalCount };
  }

  const seen = new Set<string>();
  for (const item of enItems) {
    const key = koreanKey(item.titleKo);
    if (key) seen.add(key);
  }

  const fresh: Attraction[] = [];
  const room = Math.max(0, limit - enItems.length);
  for (const item of ko.items) {
    if (fresh.length >= room) break;
    // 국문 경로는 이 시점의 title 이 아직 국문 원문이다
    const key = koreanKey(item.title);
    if (key !== null && seen.has(key)) continue;
    if (key !== null) seen.add(key);
    fresh.push(item);
  }

  const items = [...enItems, ...await fillFromKorean(fresh)];
  // 두 언어를 합친 수라 어느 쪽 API 의 totalCount 와도 맞지 않는다 (getFestivals 와 같은 판단)
  return { items, totalCount: items.length };
}

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

/**
 * 좌표 반경 내 관광지. 거리순.
 *
 * lang 을 받지 않는다. 영문을 먼저 부르고 모자랄 때만 국문을 덧대는 것이 이 함수의 일이다 —
 * 어느 언어로 부를지는 호출부가 고를 일이 아니게 됐다.
 */
export async function getNearbyAttractions({
  lat,
  lng,
  radiusM,
  limit = DEFAULT_LIMIT,
}: {
  lat: number;
  lng: number;
  radiusM: number;
  limit?: number;
}): Promise<TourResult<Attraction> | null> {
  return withKoreanBackfill(async (lang) => {
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
  }, limit);
}

/** 법정동 코드 기준 관광지. getNearbyAttractions 와 같은 이유로 lang 을 받지 않는다 */
export async function getAreaAttractions({
  regnCd,
  signguCd,
  limit = DEFAULT_LIMIT,
}: {
  regnCd: string;
  signguCd?: string;
  limit?: number;
}): Promise<TourResult<Attraction> | null> {
  return withKoreanBackfill(async (lang) => {
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
  }, limit);
}

/**
 * 법정동 코드 기준 축제. 진행중 + upcomingDays 이내 시작 예정만.
 *
 * searchFestival2는 eventStartDate 이후 "시작하는" 축제를 돌려주므로, 이미 시작해
 * 아직 안 끝난 것을 잡으려면 과거로 거슬러 받은 뒤 직접 걸러야 한다.
 *
 * 관광지와 달리 국문만 부르고 전량 번역한다. 영문·국문을 섞지 않는 이유는
 * contentId 공간이 분리돼 있어 같은 축제를 매칭할 수 없기 때문이다. 축제는 목록이 짧아
 * (실측 서울 진행중 16건, 지방은 0~2건) 중복 한 건이 그대로 눈에 띈다.
 * 관광지는 제목으로 중복을 거를 수 있지만 축제는 제목이 해마다 바뀌어 그것도 못 믿는다.
 * 국문 단일 소스로 가면 중복 자체가 생기지 않는다.
 *
 * 영문 축제 수가 국문의 1/4 수준이라(실측 서울 23 대 122) 어차피 국문이 원천이다.
 */
export async function getFestivals({
  regnCd,
  signguCd,
  upcomingDays = DEFAULT_UPCOMING_DAYS,
}: {
  regnCd: string;
  signguCd?: string;
  upcomingDays?: number;
}): Promise<TourResult<Festival> | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = yyyymmdd(today);
  const lookbackStr = yyyymmdd(new Date(today.getTime() - FESTIVAL_LOOKBACK_DAYS * DAY_MS));
  const params = ldongParams(regnCd, signguCd);

  const collected: TourItem[] = [];
  for (let page = 1; page <= FESTIVAL_MAX_PAGES; page++) {
    const res = await callTourApi("ko", "searchFestival2", {
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
      // 국문 원문이다. 바로 아래 fillFromKorean 이 title 을 번역으로 바꾸고 여기에 원문을 옮긴다
      titleKo: null,
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
  // 번역은 걸러낸 뒤에 한다 — 버릴 축제를 번역할 이유가 없다
  return { items: await fillFromKorean(items), totalCount: items.length };
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
