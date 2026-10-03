// 출처 URL 에서 미디어 칸에 임베드할 인스타그램 · X 게시물을 꺼내고, 지금 임베드되는지 oEmbed 로 확인한다.
// 확인은 서버(page.tsx)에서만 한다 — 실패(삭제 · 비공개 · 임베드 끔)면 페이지가 처음부터 지금 화면 그대로 그려진다
import { unstable_cache } from "next/cache";

export type SocialEmbedSource =
  | { platform: "INSTAGRAM"; id: string } // 게시물 shortcode
  | { platform: "X"; id: string }; // 게시물(status) 번호

// 게시물 링크만 잡는다. 프로필 링크(instagram.com/thv/) · 검색 링크(x.com/search?…)는 임베드가 안 되므로 출처 카드로 남는다.
// 인스타 공유 링크에는 아이디가 앞에 붙는 형식(instagram.com/아이디/p/…)도 있다
const INSTAGRAM_POST = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]+)/i;
const X_POST = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status(?:es)?\/(\d+)/i;

function parseSocialEmbed(url: string): SocialEmbedSource | null {
  const ig = url.match(INSTAGRAM_POST);
  if (ig) return { platform: "INSTAGRAM", id: ig[1] };
  const x = url.match(X_POST);
  if (x) return { platform: "X", id: x[1] };
  return null;
}

/** 출처 중 임베드할 수 있는 첫 게시물 하나 */
export function pickSocialEmbed<T extends { url: string }>(sources: T[]): { source: T; embed: SocialEmbedSource } | null {
  for (const source of sources) {
    const embed = parseSocialEmbed(source.url);
    if (embed) return { source, embed };
  }
  return null;
}

// 인스타 oEmbed 가 "이 게시물은 임베드할 수 없다"고 답하는 오류 코드 — 24: 없음 · 비공개 · 임베드 끔, 100: 게시물 링크가 아님
const INSTAGRAM_NOT_EMBEDDABLE = new Set([24, 100]);

// 답이 "안 된다"로 분명하면 false 를 돌려 캐시하고, 한도 초과 · 장애처럼 일시적인 실패는 던져서 캐시에 남기지 않는다
async function fetchEmbeddable(platform: SocialEmbedSource["platform"], id: string): Promise<boolean> {
  if (platform === "INSTAGRAM") {
    // Meta 는 2026-06 부터 토큰 없이도 oEmbed 를 연다 (docs/recon/social-embed.md)
    const url = `https://www.instagram.com/p/${id}/`;
    const res = await fetch(
      `https://graph.facebook.com/instagram_oembed?omitscript=true&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) return true;
    const body = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
    if (body?.error?.code !== undefined && INSTAGRAM_NOT_EMBEDDABLE.has(body.error.code)) return false;
    throw new Error(`instagram oembed ${res.status}`);
  }
  const url = `https://x.com/i/status/${id}`;
  const res = await fetch(
    `https://publish.x.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(3000) }
  );
  if (res.ok) return true;
  // 404: 삭제 · 없음, 403: 비공개 계정
  if (res.status === 404 || res.status === 403) return false;
  throw new Error(`x oembed ${res.status}`);
}

const cachedEmbeddable = unstable_cache(fetchEmbeddable, ["social-embeddable"], { revalidate: 60 * 60 * 24 });

/** 지금 임베드되는가. 확인하지 못하면(시간 초과 · 장애) false — 지금 화면 그대로 둔다 */
export async function isSocialEmbeddable(embed: SocialEmbedSource): Promise<boolean> {
  try {
    return await cachedEmbeddable(embed.platform, embed.id);
  } catch {
    return false;
  }
}
