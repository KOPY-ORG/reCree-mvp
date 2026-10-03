// 게시글 "도움이 됐어요" 투표 — 서버 전용 도우미 (로그인 없이 누른다)
//
// 기기 구분: 서버가 심는 httpOnly 쿠키의 무작위 ID(voterKey). 스크립트가 값을 지어낼 수 없고,
// 쿠키를 버리면 새 ID 가 생기지만 그때는 아래 IP 기준 제한에 걸린다.
// IP: 원문은 어디에도 저장하지 않는다. 비밀키로 HMAC 한 값(ipHash)만 남겨 "같은 곳에서 온 반복" 을 센다.
import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";

const VOTER_COOKIE = "recree_vid";
// 브라우저가 허용하는 최대 쿠키 수명(400일)
const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const VOTER_KEY_PATTERN = /^[0-9a-f-]{36}$/;

/** 남용 방지 한도 — 숫자를 바꾸면 여기만 고친다 */
export const HELPFUL_LIMITS = {
  /** 같은 곳(ipHash)에서 짧은 시간에 누를 수 있는 횟수 — 이 서버 인스턴스 메모리 기준, 취소 포함 */
  burst: { windowMs: 60_000, max: 10 },
  /** 같은 곳에서 모든 글에 새로 남기는 투표 수 */
  perIp: { windowMs: 10 * 60_000, max: 30 },
  /** 같은 곳에서 한 글에 남기는 투표 수 — 한 집 · 한 사무실 여러 기기까지는 허용 */
  perPostPerIp: { windowMs: 24 * 60 * 60_000, max: 5 },
} as const;

/** 쿠키의 voterKey. 없거나 모양이 이상하면 null (읽기 전용 — 페이지 렌더에서 쓴다) */
export async function readVoterKey(): Promise<string | null> {
  const value = (await cookies()).get(VOTER_COOKIE)?.value;
  return value && VOTER_KEY_PATTERN.test(value) ? value : null;
}

/** voterKey 를 읽고, 없으면 새로 만들어 쿠키에 심는다 (Server Action 안에서만) */
export async function ensureVoterKey(): Promise<string> {
  const existing = await readVoterKey();
  if (existing) return existing;
  const key = randomUUID();
  (await cookies()).set(VOTER_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE,
  });
  return key;
}

/**
 * 요청 IP 의 HMAC. 비밀키는 VOTE_HASH_SECRET, 없으면 서버 전용 키(SUPABASE_SERVICE_ROLE_KEY)를 쓴다.
 * 둘 다 없으면 null — 그 경우 투표를 받지 않는다 (IP 원문으로 대신 세지 않기 위해)
 */
export async function hashRequestIp(): Promise<string | null> {
  const secret = process.env.VOTE_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

// 짧은 시간 연타 제한. 서버리스는 인스턴스마다 메모리가 따로라 완벽하지 않다 —
// 오래 버티는 한도는 DB 기준(perIp · perPostPerIp)이 맡고, 이건 순간 폭주만 끊는다
const burstLog = new Map<string, number[]>();

export function hitBurstLimit(ipHash: string, now = Date.now()): boolean {
  const { windowMs, max } = HELPFUL_LIMITS.burst;
  const recent = (burstLog.get(ipHash) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    burstLog.set(ipHash, recent);
    return true;
  }
  recent.push(now);
  burstLog.set(ipHash, recent);
  // 오래된 키가 쌓이지 않게 가끔 비운다
  if (burstLog.size > 5000) {
    for (const [key, times] of burstLog) {
      if (times.every((t) => now - t >= windowMs)) burstLog.delete(key);
    }
  }
  return false;
}
