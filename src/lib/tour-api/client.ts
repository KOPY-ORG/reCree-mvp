// ─── TourAPI 호출 래퍼 ────────────────────────────────────────────────────────
// prisma/scripts/tour-api-spike-2.ts 의 callTourApi를 앱 모듈로 옮긴 것.
// 실패는 throw하지 않고 ok=false로 반환한다 — 호출한 섹션만 죽고 나머지는 산다.

import type { TourItem, TourLang } from "./types";

const KOR_BASE = "http://apis.data.go.kr/B551011/KorService2";
const ENG_BASE = "http://apis.data.go.kr/B551011/EngService2";

const MOBILE_OS = "ETC";
const MOBILE_APP = "recree";

const REQUEST_TIMEOUT_MS = 15_000;

export type CallResult = {
  ok: boolean;
  items: TourItem[];
  totalCount: number | null;
  error: string | null;
};

function baseUrl(lang: TourLang): string {
  return lang === "ko" ? KOR_BASE : ENG_BASE;
}

function normalizeItems(items: unknown): TourItem[] {
  // 결과 0건이면 items가 빈 문자열 ""로 오는 경우가 있음
  if (!items || typeof items === "string") return [];
  const item = (items as { item?: unknown }).item;
  if (!item || typeof item === "string") return [];
  if (Array.isArray(item)) return item as TourItem[];
  return [item as TourItem];
}

/** 키 후보를 순서대로 훑어 첫 유효값을 꺼낸다. 응답 필드명이 문서와 다를 때의 방어 */
export function pickField(item: TourItem, keys: string[]): string | null {
  for (const key of keys) {
    const v = item[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

const fail = (error: string): CallResult => ({ ok: false, items: [], totalCount: null, error });

/**
 * TourAPI 호출. 실패 5종(HTTP·JSON 파싱·header 없음·resultCode·네트워크)을 전부
 * 흡수해 ok=false로 돌려준다. 실패해도 items는 빈 배열이라 호출부가 터지지 않는다.
 */
export async function callTourApi(
  lang: TourLang,
  endpoint: string,
  params: Record<string, string | number>
): Promise<CallResult> {
  const url = new URL(`${baseUrl(lang)}/${endpoint}`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY ?? ""); // 디코딩키 → URLSearchParams가 인코딩
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", "1");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

    if (!res.ok) return fail(`HTTP ${res.status}`);

    const text = await res.text();

    // 인증 실패 등은 _type=json을 무시하고 XML로 응답하는 경우가 있음
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return fail(`JSON 파싱 실패: ${text.slice(0, 200).replace(/\s+/g, " ")}`);
    }

    const response = (data as { response?: Record<string, unknown> }).response;
    const header = response?.header as { resultCode?: string; resultMsg?: string } | undefined;
    if (!header) return fail(`response.header 없음: ${text.slice(0, 200)}`);
    if (header.resultCode !== "0000") {
      return fail(`resultCode=${header.resultCode} (${header.resultMsg ?? "메시지 없음"})`);
    }

    const body = response?.body as { items?: unknown; totalCount?: number } | undefined;
    return {
      ok: true,
      items: normalizeItems(body?.items),
      totalCount: typeof body?.totalCount === "number" ? body.totalCount : null,
      error: null,
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
