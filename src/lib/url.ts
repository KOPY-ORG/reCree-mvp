/**
 * URL 의 호스트 이름(www. 뺀 것). 잘못된 URL 이면 fallback 을 돌려준다 —
 * 화면에 글자로 보일 때는 원래 url, 판정 · 짧은 이름에 쓸 때는 "" 를 넘긴다
 */
export function hostnameOf(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}
