// 홈 탭바의 ?tab= 해석 — 서버·클라이언트 어디서나 쓸 수 있는 순수 함수

export type FeedTab =
  | { kind: "hot" }
  | { kind: "topic"; slug: string; topicId: string };

export const HOT_TAB: FeedTab = { kind: "hot" };

/**
 * ?tab= 을 탭으로 바꾼다.
 *
 * 규칙은 하나다 — **내가 구독한 토픽의 slug 로 읽히면 그 탭, 아니면 Hot.**
 * 옛 링크(?tab=follow)나 구독을 푼 토픽, 오타 난 slug 가 전부 이 한 줄에 걸린다.
 * 값마다 예외를 두면 폐기된 값이 늘어날수록 분기가 쌓이고,
 * "구독하지 않은 토픽 탭"이라는 있을 수 없는 상태가 생긴다.
 */
export function resolveFeedTab(
  rawTab: string | undefined,
  followedTopics: readonly { id: string; slug: string }[],
): FeedTab {
  if (!rawTab) return HOT_TAB;
  const matched = followedTopics.find((t) => t.slug === rawTab);
  return matched ? { kind: "topic", slug: matched.slug, topicId: matched.id } : HOT_TAB;
}

/** 탭에 해당하는 URL. Hot 은 쿼리를 남기지 않는다 */
export function feedTabHref(tab: FeedTab): string {
  return tab.kind === "hot" ? "/feed" : `/feed?tab=${encodeURIComponent(tab.slug)}`;
}
