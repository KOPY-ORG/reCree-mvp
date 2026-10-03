// 사진 · 제목 · 지도가 다 그려진 뒤(load) 브라우저가 한가할 때 cb 를 부른다. 외부 플레이어 · 임베드를 늦게 부르는 데 쓴다 (YouTubeEmbed · SocialEmbed)
export function afterPageLoad(cb: () => void): () => void {
  let idleId: number | null = null;
  const run = () => {
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(cb, { timeout: 2000 });
    } else {
      idleId = globalThis.setTimeout(cb, 0) as unknown as number;
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    window.removeEventListener("load", run);
    if (idleId === null) return;
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    else globalThis.clearTimeout(idleId);
  };
}
