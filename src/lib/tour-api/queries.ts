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

/**
 * 시군구 코드 배열을 호출 단위로 편다. 빈 배열이면 [undefined] — 시도 전체 조회다.
 *
 * 코드마다 따로 부르는 것 말고 방법이 없다. lDongSignguCd 는 값을 하나만 받는다.
 * 실측(searchFestival2 · areaBasedList2 양쪽 동일):
 *   111             →  1건
 *   111,113,115,117 →  0건   ← 쉼표
 *   111|113         →  0건   ← 파이프
 *   111&...&117     →  1건   ← 파라미터 반복. 합집합이 아니라 하나만 먹는다
 * 셋 다 resultCode 0000 으로 조용히 0건이 온다. 에러가 안 나서 더 위험하다.
 *
 * 응답 item 에 lDongSignguCd 가 들어 있어 "시도 전체를 받아 로컬에서 거르기" 도
 * 되지만 쓰지 않는다. 축제는 시도 최대 142건이라 되는데 관광지는 경기가 9,440건이다.
 * 두 함수가 다른 전략을 쓰면 같은 지역에서 한쪽만 비는 이유를 설명할 수 없게 된다.
 */
function signguCalls(signguCds: string[]): (string | undefined)[] {
  return signguCds.length === 0 ? [undefined] : signguCds;
}

/**
 * 여러 목록을 라운드로빈으로 섞는다.
 *
 * 이어 붙이면 앞에서 자를 때 첫 구가 limit 을 다 먹는다 — arrange=A 라 수원이
 * 장안구 스무 건이 되고 나머지 세 구는 한 건도 안 보인다. 번갈아 꺼내면 시 전체가 고루 뜬다.
 */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
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
    cat2: pickField(item, ["cat2"]),
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

/**
 * 지역 목록에서 빼는 콘텐츠 타입 — 축제/공연/행사.
 *
 * 같은 지역의 축제는 바로 아래 getFestivals 가 날짜와 진행 상태까지 붙여 따로 낸다.
 * 한 항목이 두 줄에 동시에 서면 줄을 나눈 이유가 없어진다.
 *
 * 그냥 겹치는 정도가 아니라 위쪽이 틀린 값을 낸다. areaBasedList2 는 기간을 보지 않아
 * 이미 끝난 행사를 상설 장소와 같은 모양으로 돌려주는데, 관광지 카드에는 날짜 자리가
 * 없어 끝났다는 사실이 어디에도 드러나지 않는다 (서울 영문 축제 40건 표본 —
 * 이미 끝남 23 · 유효 8 · 기간 필드가 아예 빈 것 9).
 *
 * 두 코드를 함께 적는다. detail-fields 와 같은 이유로 서비스마다 번호가 갈린다 —
 * KorService2 는 15, EngService2 는 85 다. 지금 네 지역은 영문이 임계를 넘겨
 * 실제로 걸러지는 것은 전부 85 쪽이지만, 국문 보강이 붙는 지역이 생기면 15 가 온다.
 *
 * cat2 로 거르지 않는다. 축제 항목의 cat2 는 A0207 · A0208 이거나 빈값인데
 * (실측 서울 300건 — A0207 은 전부 contentTypeId 15 와 함께 왔고, 역은 성립하지 않았다)
 * contentTypeId 가 그 셋을 모두 덮는 상위 집합이다. 좁은 쪽을 더 볼 필요가 없다.
 */
const FESTIVAL_CONTENT_TYPES = new Set(["15", "85"]);

/**
 * 지역 목록에서 빼는 콘텐츠 타입 — 쇼핑.
 *
 * 영문 지역 목록은 사실상 쇼핑 목록이다. 면세 환급 가맹점(Tax Refund Shop)이 통째로
 * 들어와 있어 제목순 앞자리를 "7-Eleven", "8 Seconds", "ABC-Mart" 가 채운다.
 * 실측 비중(영문·1,000건 요청) 서울 919/1,000 · 마포 278/327 · 수원 290/331 ·
 * 제주 352/582 · 충북 127/262. 여행지를 찾는 줄에서 편의점이 앞에 설 이유가 없다.
 *
 * 축제와 같은 이유로 두 코드를 함께 적는다 — 서비스마다 번호가 갈린다.
 * 실응답으로 확인했다(contentTypeId 를 직접 지정한 서울 조회):
 *   KorService2 38 → 4,356건, "가나안경원 명동점 · 가나안약국 · 가네시 롯데백화점 본점"
 *   EngService2 79 → 4,147건, "0914 Flagship Store Dosan Park[Tax Refund Shop]"
 *
 * cat2(A0401 Shopping)로 거르지 않는다. 축제와 같은 판단이다 — cat2 는 38% 만 차 있고
 * contentTypeId 는 실측 160/160 이 차 있다.
 */
const SHOPPING_CONTENT_TYPES = new Set(["38", "79"]);

/**
 * 지역 목록에서 빼는 콘텐츠 타입 — 숙박.
 *
 * "이 지역에 뭐가 있나" 를 훑는 줄에 호텔·게스트하우스가 낄 자리가 아니다. 쇼핑과 달리
 * 목록을 잠식하지는 않지만(영문 실측 서울 3 · 마포 3 · 수원 1 · 제주 13 · 충북 7)
 * 제목순 앞자리를 이름으로 차지한다 — 서울 앞 다섯 중 둘이 "Aank ..." 호텔이었다.
 *
 * 음식점(KorService2 39 · EngService2 82)은 남긴다. 먹으러 가는 것은 그 지역에서
 * 할 일이지만 자는 것은 일정을 짜는 일이라, 이 줄이 답하는 질문이 서로 다르다.
 *
 * 두 방법으로 확인했다(서울, 실응답):
 *   contentTypeId 지정 조회  KorService2 32 → 382건 "강남스테이힐 · 강남아르누보씨티호텔"
 *                            EngService2 80 →  36건 "Aank Air Hotel Gaebong …"
 *   searchStay2(숙박 전용)    국문 응답의 contenttypeid 가 전부 32, 영문은 전부 80 이고
 *                            totalCount 도 382 · 36 으로 위와 같았다
 */
const STAY_CONTENT_TYPES = new Set(["32", "80"]);

/** 지역 목록에서 빼는 것 전부. 빼는 이유가 서로 달라 따로 적고 여기서 합친다 */
const AREA_EXCLUDED_CONTENT_TYPES = new Set([
  ...FESTIVAL_CONTENT_TYPES,
  ...SHOPPING_CONTENT_TYPES,
  ...STAY_CONTENT_TYPES,
]);

/**
 * 지역 목록에서 한 번에 받아 오는 수. limit 과 이어지지 않는다 —
 * 걸러내는 양을 정하는 것이 limit 이 아니라 그 지역의 쇼핑 비중이기 때문이다.
 *
 * 축제만 뺄 때는 limit+10 으로 충분했다(비중 1.6~2.7%). 쇼핑이 들어오면서 그 셈이 깨졌다.
 * 실측 — 영문·arrange=O 로 요청해 필터를 통과한 수:
 *        요청 60  200  500  1,000
 *   서울        1    8   37     73
 *   마포        2   19   44     44   ← 영문 재고 327건이 전부라 더 받아도 안 는다
 *   수원       15   37   37     37   ← 같은 이유로 331건이 전부
 *   제주       10   61  142    210
 *   충북       32   80  124    124   ← 262건이 전부
 * limit 50 을 채우려면 서울이 1,000 을 요구한다. 마포·수원은 재고가 먼저 바닥나
 * 몇 을 요청하든 44·37 이고, 국문 보강은 10건 미만일 때만 붙는 장치라 여기선 안 붙는다.
 *
 * 호출 수는 그대로다. 1,000건 응답이 575ms · 674KB 라 REQUEST_TIMEOUT_MS(4초) 안이다.
 */
const AREA_FETCH_ROWS = 1000;

/**
 * 지역 목록 정렬 — "대표이미지 있는 것 먼저, 그 안에서 제목순".
 *
 * 걷어낸 자리를 이미지 없는 항목이 채우면 회색 자리표시만 늘어난다.
 * 실측(1,000건 요청 후 필터, 앞 50장의 이미지 보유) — arrange=A 는 서울 22/50 ·
 * 제주 32/50 · 충북 40/50 인데 O 는 셋 다 50/50 이다
 * (마포·수원은 통과분이 44·37 이라 그 전량인 28/44 · 31/37 로 같다).
 *
 * O 는 거르는 정렬이 아니라 앞으로 당기는 정렬이다 — 전량이 들어오는 지역에서
 * A 와 O 의 통과 건수가 충북 124 · 마포 44 · 수원 37 · 제주 210 으로 같았다.
 * 재고가 줄지 않는다.
 *
 * 이미지 우선 3종(O 제목순 · Q 수정일순 · R 생성일순) 중 O 를 쓰는 이유는 셋이다.
 *   수율  서울은 4,971건의 일부만 오므로 정렬이 곧 표본이다. 통과 수가
 *         O 73 · Q 55 · R 11 이라 R 은 limit(50)을 못 채운다
 *   안정  Q·R 은 관광공사가 레코드를 손대면 순서가 바뀐다. 제목순은 고정이다
 *   범위  Q·R 은 축제를 앞으로 끌어온다(서울 60건 중 Q 20 · R 14). 축제는 아래 줄이
 *         날짜까지 붙여 따로 내는 것이라 여기서는 버려지는 자리다
 * 바꾼 것은 하나다 — 제목순은 그대로 두고 이미지 있는 것을 앞으로 당겼다.
 */
const AREA_ARRANGE = "O";

/**
 * 법정동 코드 기준 관광지. getNearbyAttractions 와 같은 이유로 lang 을 받지 않는다.
 *
 * signguCds 가 여럿이면 코드마다 부른다(signguCalls 주석 참고). 병렬이라 호출 수는
 * 늘어도 지연은 한 번과 같다. 코드마다 AREA_FETCH_ROWS 씩 받는데, 나눠서 조금씩 받으면
 * 한 구가 비었을 때 limit 을 못 채운다 — 더 받는 비용은 사실상 없다(위 주석).
 */
export async function getAreaAttractions({
  regnCd,
  signguCds,
  limit = DEFAULT_LIMIT,
}: {
  regnCd: string;
  signguCds: string[];
  limit?: number;
}): Promise<TourResult<Attraction> | null> {
  return withKoreanBackfill(async (lang) => {
    const results = await Promise.all(
      signguCalls(signguCds).map((signguCd) =>
        callTourApi(lang, "areaBasedList2", {
          ...ldongParams(regnCd, signguCd),
          numOfRows: AREA_FETCH_ROWS,
          arrange: AREA_ARRANGE,
        }),
      ),
    );

    // 하나라도 살아 있으면 그만큼 쓴다. 전부 죽었을 때만 언어 경로를 죽인다
    const ok = results.filter((r) => r.ok);
    if (ok.length === 0) return null;

    const lists = ok.map((res) =>
      res.items
        .map((i) => toAttraction(i, lang))
        .filter(
          (a): a is Attraction =>
            a !== null && !AREA_EXCLUDED_CONTENT_TYPES.has(a.contentTypeId ?? ""),
        ),
    );
    const items = interleave(lists).slice(0, limit);

    // totalCount 는 API 가 준 것을 그대로 둔다 — 축제·쇼핑을 뺀 수가 아니지만,
    // 이 값을 읽는 쪽이 없고 "지역에 몇 건이 있는지" 라는 뜻은 그대로다.
    // 코드가 여럿이면 합이다. 구끼리 겹치지 않으므로 중복이 아니다
    const totalCount = ok.reduce((sum, r) => sum + (r.totalCount ?? 0), 0);
    return { items, totalCount };
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
  signguCds,
  upcomingDays = DEFAULT_UPCOMING_DAYS,
  limit = DEFAULT_LIMIT,
}: {
  regnCd: string;
  signguCds: string[];
  upcomingDays?: number;
  /** 화면에 올릴 개수. 이 수만큼만 번역한다 — 번역 비용이 곧 개수다 */
  limit?: number;
}): Promise<TourResult<Festival> | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = yyyymmdd(today);
  const lookbackStr = yyyymmdd(new Date(today.getTime() - FESTIVAL_LOOKBACK_DAYS * DAY_MS));

  /** 코드 하나 몫. 페이지는 순차, 코드끼리는 병렬이다. null 은 첫 페이지부터 실패 */
  const fetchOne = async (signguCd: string | undefined): Promise<TourItem[] | null> => {
    const params = ldongParams(regnCd, signguCd);
    const got: TourItem[] = [];
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
      got.push(...res.items);
      if (res.items.length < FESTIVAL_ROWS) break;
    }
    return got;
  };

  const perCode = await Promise.all(signguCalls(signguCds).map(fetchOne));
  // 전부 죽었을 때만 섹션을 죽인다. 하나라도 살아 있으면 그만큼 보여준다
  if (perCode.every((got) => got === null)) return null;

  // 축제 하나는 구 하나에만 속하므로 코드끼리 겹치지 않지만, 응답이 흔들려도
  // 같은 카드가 두 장 뜨지 않게 contentid 로 한 번 거른다
  const seenContentIds = new Set<string>();
  const collected: TourItem[] = [];
  for (const got of perCode) {
    if (got === null) continue;
    for (const item of got) {
      const id = pickField(item, ["contentid"]);
      if (id !== null && seenContentIds.has(id)) continue;
      if (id !== null) seenContentIds.add(id);
      collected.push(item);
    }
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
