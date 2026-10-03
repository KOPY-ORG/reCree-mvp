// 게시글 상세의 블록 배치 규칙 — 모바일 한 줄 순서와 lg 두 열을 같은 DOM 으로 맞춘다 (page.tsx 의 설명 참고)

const ORDER = ["order-1", "order-2", "order-3", "order-4", "order-5", "order-6",
               "order-7", "order-8", "order-9", "order-10", "order-11", "order-12"];

/**
 * twoCol 이면 lg 에서 두 열, 아니면 lg 에서도 모바일처럼 한 줄이다.
 * - SPAN: 모바일 바깥 틀은 2칸 격자다 — 칩(1fr) 옆에 댓글 · 저장(auto)이 서고, 나머지 블록은 두 칸을 다 쓴다.
 *   칩과 아이콘 줄이 lg 에서 서로 다른 열로 갈리므로 한 블록 안 격자로는 둘 다 맞출 수 없다
 * - order(n): 모바일 순서. lg 두 열에서는 DOM 순서로 돌아간다
 * - gap: 블록 위 간격. 모바일은 블록 위 마진, lg 두 열은 열의 gap 이 맡는다
 * - column(lgGap): 열 래퍼. 모바일은 풀려서(contents) 블록들이 바깥 격자의 형제가 된다
 * - block: 블록 안쪽 요소의 위아래 마진을 지운다
 */
export function makeDetailLayout(twoCol: boolean) {
  const SPAN = "col-span-2 min-w-0";
  return {
    SPAN,
    order: (n: number) => `${SPAN} ${twoCol ? `${ORDER[n - 1]} lg:order-none` : ORDER[n - 1]}`,
    gap: twoCol ? "mt-6 lg:mt-0" : "mt-6",
    column: (lgGap: string) => (twoCol ? `contents lg:flex lg:min-w-0 lg:flex-col ${lgGap}` : "contents"),
    block: "[&>*]:mt-0 [&>*]:mb-0",
  };
}
