// 카드 목록 격자 — 폭이 넓어지면 카드를 키우지 않고 열을 늘린다 (2 → md 3 → lg 4 → xl 5).
// shop · recreeshot · topic 글 · journeys 와 각 로딩 화면이 같이 쓴다

export const CARD_GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

/** 격자가 화면 가장자리에서 띄우는 좌우 여백 — 모바일 16, lg 는 페이지 gutter */
export const CARD_GRID_GUTTER = "px-4 lg:px-[var(--page-gutter)]";
