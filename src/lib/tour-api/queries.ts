// ─── TourAPI 기능별 조회 ──────────────────────────────────────────────────────
// 공개 함수 4개. 전부 실패 시 null을 반환하고 throw하지 않는다.
// 지역 필터는 법정동 코드(lDongRegnCd/lDongSignguCd)만 쓴다 — areaCode는 과소집계한다.

import { callTourApi, pickField } from "./client";
import { koreanKey, splitBilingualTitle } from "./title";
import { detailFieldsFor } from "./detail-fields";
import { translateKoToEn } from "./translate";
import type {
  Attraction,
  AttractionEssentials,
  AttractionIntroRow,
  Festival,
  LdongCode,
  TourItem,
  TourLang,
  TourResult,
} from "./types";

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

/** lang 은 부른 서비스 그대로다. 상세 조회가 이 값으로 어느 서비스에 물을지 정한다 */
function toAttraction(item: TourItem, lang: TourLang): Attraction | null {
  const contentId = pickField(item, ["contentid"]);
  const title = pickField(item, ["title"]);
  if (!contentId || !title) return null;

  const dist = pickField(item, ["dist"]);
  const distNum = dist === null ? NaN : Number(dist);

  return {
    contentId,
    lang,
    title,
    // 언어에 상관없이 원문을 그대로 담아 둔다. 언어별 처리는 아래 두 함수가 한다
    titleKo: null,
    address: toAddress(item),
    addressKo: null,
    lat: toCoord(pickField(item, ["mapy"])),
    lng: toCoord(pickField(item, ["mapx"])),
    imageUrl: toImageUrl(item),
    distanceM: Number.isFinite(distNum) ? Math.round(distNum) : null,
    contentTypeId: pickField(item, ["contenttypeid"]),
  };
}

// ─── 국문 보강 ────────────────────────────────────────────────────────────────

/** 아래 두 함수는 이 네 칸만 보므로 관광지든 축제든 그대로 쓴다 */
type Bilingual = {
  title: string;
  titleKo: string | null;
  address: string | null;
  addressKo: string | null;
};

/** 영문 응답 — "영문 (한글)" 을 쪼개기만 한다. 번역 호출이 없다 */
function splitEnglish<T extends Bilingual>(items: T[]): T[] {
  return items.map((item) => {
    const { titleEn, titleKo } = splitBilingualTitle(item.title);
    return { ...item, title: titleEn, titleKo };
  });
}

/**
 * 국문 응답 — 제목만 번역해 영문을 채운다. titleKo 가 원문, title 이 번역 결과다.
 * 영문 경로와 필드 의미가 같아진다. 번역이 실패한 항목은 title 에 국문이 그대로 남는다.
 *
 * 주소는 번역하지 않고 addressKo 로 옮긴다. 두 가지 이유다.
 *   품질 — 실측에서 같은 응답 안에 "Jeonnam-Gwangju Special Metropolitan City" 와
 *          "Jeonnam Gwangju Tonghap Teukbyeolsi" 가 섞였고, 장소명이 주소 끝에 붙은 건도 있었다.
 *   쓸모 — 국문 주소는 택시 기사에게 보여주거나 지도앱에 붙여넣으면 그대로 통한다.
 *          기계가 로마자로 옮긴 주소는 그 두 가지가 다 안 된다.
 * 화면은 address 만 그리므로 이 항목들에는 주소 줄이 생기지 않는다. 값은 저장용으로 남는다.
 */
async function fillFromKorean<T extends Bilingual>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;

  const translated = await translateKoToEn(items.map((item) => item.title));

  return items.map((item) => ({
    ...item,
    titleKo: item.title,
    title: translated[item.title] ?? item.title,
    address: null,
    addressKo: item.address,
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
      items: res.items.map((i) => toAttraction(i, lang)).filter((a): a is Attraction => a !== null),
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
      items: res.items.map((i) => toAttraction(i, lang)).filter((a): a is Attraction => a !== null),
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
  limit = DEFAULT_LIMIT,
}: {
  regnCd: string;
  signguCd?: string;
  upcomingDays?: number;
  /** 화면에 올릴 개수. 이 수만큼만 번역한다 — 번역 비용이 곧 개수다 */
  limit?: number;
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
      addressKo: null,
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

  // ongoing 먼저. 그 안의 순서는 "곧 끝나는 것"이다.
  //
  // startDate 오름차순이었는데, 그러면 1월 1일에 시작한 연중 상설이 맨 앞을 차지한다.
  // 실측 서울은 진행중 19건이 거의 전부 상설(왕궁수문장 교대의식 · DDP 건축투어 등)이라
  // 12칸을 그것들이 다 먹고, upcomingDays 를 늘려도 화면이 그대로였다.
  // 놓치면 안 되는 것은 곧 끝나는 것이고, 상설은 언제 가도 되므로 뒤로 가도 손해가 없다.
  //
  // 끝나는 날이 같으면 늦게 시작한 것을 앞에 둔다 — 서울은 12월 31일에 끝나는 것이
  // 여럿이라 이 갈림이 실제로 순서를 정한다. 같은 날 끝난다면 짧게 하는 쪽이 행사에 가깝다.
  //
  // upcoming 은 그대로 startDate 오름차순이다. 아직 시작도 안 한 것에서는 임박한 것이 먼저다.
  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
    if (a.status === "ongoing") {
      return a.daysUntilEnd - b.daysUntilEnd || b.startDate.localeCompare(a.startDate);
    }
    return a.startDate.localeCompare(b.startDate);
  });

  // 자르는 것은 정렬 뒤다 — 진행중이 먼저고 그다음이 임박순이라 앞에서 자르면 가장 볼 만한 것만 남는다.
  // 번역도 자른 뒤에 한다. 서울은 45건이 잡히는데 버릴 25건까지 번역하면
  // 지연도 하루 할당량도 그만큼 헛으로 나간다.
  const shown = items.slice(0, limit);

  // API의 totalCount는 lookback 범위 전체(끝난 축제 포함) 건수라 필터 결과와 맞지 않는다.
  // 자르기 전 건수를 돌려준다 — "몇 건 중 몇 건을 보여주는지" 는 호출부가 알아야 한다
  return { items: await fillFromKorean(shown), totalCount: items.length };
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

// ─── 상세 ─────────────────────────────────────────────────────────────────────
// 세 엔드포인트를 세 함수로 나눈다. 화면이 도착하는 대로 채우기 위해서다 —
// 하나로 묶으면 가장 느린 것(번역)이 나머지를 붙잡는다.
//
// 어느 것도 캐싱하지 않는다. TourAPI 응답은 실시간 호출이 요강이다.
// 캐싱되는 것은 translateKoToEn 안의 번역 결과뿐이고, 그건 공공데이터가 아니라 파생물이다.

/** 응답에 <br> 과 <a> 가 섞여 온다(영문 intro 실측 35~45%). 태그를 걷고 빈 값은 null 로 */
function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s === "" ? null : s;
}

/** 본문에 섞인 주소. 닫는 괄호·따옴표·꺾쇠는 주소의 일부가 아니라 그 앞에서 끊는다 */
const BARE_URL = /https?:\/\/[^\s<>"'()[\]]+/gi;

/**
 * homepage 에서 주소만 뽑는다.
 *
 * 관광지와 축제가 형태가 다르다. 값이 있는 54건(관광지 · 축제 · Nearby) 실측:
 *
 *   <a href> 를 쓴 것          18건   관광지 쪽. href 를 그대로 쓴다
 *   태그 없이 맨 URL 만         24건   축제 쪽. "공식 홈페이지 https://…" 처럼 라벨이 앞에 붙는다
 *   프로토콜 없는 주소만        12건   "www.ssfshop.com" · "adidas.co.kr". 아래 참고
 *   URL 두 개 이상              8건   전부 \n 으로 이어진다 (<br> 로 온 것은 0건이었다)
 *
 * 예전 폴백은 태그를 걷은 문자열 "전체"가 URL 일 때만 인정해서(^…$), 라벨이 한 글자라도
 * 앞에 붙으면 통째로 버렸다. 축제는 그 라벨이 거의 항상 붙어 있어 절반이 빈손으로 돌아왔다.
 * 이제 본문 어디에 있든 긁는다.
 *
 * <a> 가 있으면 href 만 쓰고 본문은 보지 않는다. 앵커 글자가 주소를 그대로 적어 둔 경우가
 * 많은데 잘려 있을 때가 있어서, 둘을 섞으면 깨진 주소가 한 줄 더 생긴다.
 *
 * 프로토콜 없는 주소는 뽑지 않는다. 한글 본문에서 "낱말.낱말" 을 주소로 오인할 여지가 있고,
 * 12건 중 11건이 면세점·브랜드샵이라 얻는 것에 비해 위험이 크다.
 *
 * 태그를 화면에 그대로 내보내지 않는다. target·rel 은 우리가 붙인다.
 */
function parseHomepageUrls(v: unknown): string[] {
  if (typeof v !== "string" || v.trim() === "") return [];

  const urls: string[] = [];
  for (const m of v.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const u = m[1].trim();
    if (/^https?:\/\//i.test(u)) urls.push(u);
  }

  // <a> 가 하나도 없으면 태그를 걷어낸 본문에서 주소를 긁는다.
  // cleanText 가 <br> 을 \n 으로 바꾸고 줄바꿈을 남기므로 여러 개도 그대로 갈린다.
  if (urls.length === 0) {
    const bare = cleanText(v);
    if (bare) {
      for (const m of bare.matchAll(BARE_URL)) {
        // 문장 끝에 붙은 마침표·쉼표는 주소가 아니다
        const u = m[0].replace(/[.,;:!?]+$/, "");
        if (u.length > "https://".length) urls.push(u);
      }
    }
  }

  // 같은 주소를 두 번 그리지 않는다. 셋이면 충분하다
  return [...new Set(urls)].slice(0, 3);
}

/** 상세 조회 공통 — 항목 하나를 꺼낸다. 실패·0건이면 null */
async function detailItem(
  lang: TourLang,
  endpoint: string,
  params: Record<string, string | number>
): Promise<TourItem | null> {
  const res = await callTourApi(lang, endpoint, { contentId: params.contentId, ...params });
  if (!res.ok || res.items.length === 0) return null;
  return res.items[0];
}

/**
 * detailCommon2 — 개요 · 주소 · 홈페이지.
 *
 * 국문 경로면 개요를 번역한다. 주소는 번역하지 않는다 — fillFromKorean 과 같은 이유다.
 * 번역이 실패하면 국문 원문이 그대로 남는다. 비어 있는 것보다 낫다.
 */
export async function getAttractionEssentials({
  contentId,
  lang,
}: {
  contentId: string;
  lang: TourLang;
}): Promise<AttractionEssentials | null> {
  const item = await detailItem(lang, "detailCommon2", { contentId });
  if (item === null) return null;

  let overview = cleanText(item.overview);
  if (overview !== null && lang === "ko") {
    const translated = await translateKoToEn([overview]);
    overview = translated[overview] ?? overview;
  }

  return {
    overview,
    address: toAddress(item),
    homepageUrls: parseHomepageUrls(item.homepage),
  };
}

/** detailImage2 — 갤러리. 사진에는 언어가 없지만 contentId 가 갈려 부른 쪽 서비스로 물어야 한다 */
export async function getAttractionImages({
  contentId,
  lang,
}: {
  contentId: string;
  lang: TourLang;
}): Promise<string[] | null> {
  const res = await callTourApi(lang, "detailImage2", {
    contentId,
    imageYN: "Y",
    numOfRows: 30,
  });
  if (!res.ok) return null;

  const urls: string[] = [];
  for (const item of res.items) {
    const url = pickField(item, ["originimgurl", "smallimageurl"]);
    if (url) urls.push(url);
  }
  return [...new Set(urls)];
}

/**
 * detailIntro2 — 영업시간 · 휴무 · 주차 등. 타입별 필드명 분기는 detail-fields 가 갖는다.
 *
 * 라벨까지 붙여 내보낸다. 화면이 contentTypeId 를 다시 해석할 일이 없다.
 * 값이 빈 줄은 여기서 지운다 — "—" 를 그리지 않기 때문에 화면에 갈 필요가 없다.
 * 국문 경로면 값만 번역한다. 라벨은 우리가 쓴 영어다.
 */
export async function getAttractionIntro({
  contentId,
  contentTypeId,
  lang,
}: {
  contentId: string;
  contentTypeId: string | null;
  lang: TourLang;
}): Promise<AttractionIntroRow[] | null> {
  const fields = detailFieldsFor(contentTypeId);
  if (fields.length === 0 || !contentTypeId) return [];

  const item = await detailItem(lang, "detailIntro2", { contentId, contentTypeId });
  if (item === null) return null;

  const rows: AttractionIntroRow[] = [];
  for (const field of fields) {
    const value = cleanText(item[field.key]);
    if (value !== null) rows.push({ label: field.label, value });
  }
  if (rows.length === 0 || lang === "en") return rows;

  const translated = await translateKoToEn(rows.map((r) => r.value));
  return rows.map((r) => ({ label: r.label, value: translated[r.value] ?? r.value }));
}
