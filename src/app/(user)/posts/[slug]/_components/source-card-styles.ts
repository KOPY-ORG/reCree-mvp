// 오른쪽 열(모바일은 출처 자리) 출처 카드의 공통 모양 — BookmarkCard · NetflixCard

/** 카드 겉. 왼쪽 칸(썸네일 · 플랫폼 칸)은 카드가 자르는 모서리(20px)를 그대로 따라간다 — 칸에 따로 모서리를 주지 않는다 */
export const SOURCE_CARD =
  "surface-card flex flex-row overflow-hidden min-h-20 transition-opacity active:opacity-70 lg:min-h-[72px] lg:items-center lg:hover:opacity-80";

/**
 * 왼쪽 칸 lg 모양 — 오른쪽 열(350~380) 폭에 맞춘 한 줄 카드라, 카드 높이를 채우는 띠 대신 44 둥근 네모가 된다.
 * 모바일 모양은 그대로다
 */
export const SOURCE_CARD_LG_THUMB = "lg:ml-3.5 lg:size-11 lg:self-center lg:rounded-xl";

/** 플랫폼 색 칸 (썸네일이 없을 때). 바탕색은 부르는 쪽이 덧붙인다 */
export const SOURCE_CARD_BADGE = `w-20 shrink-0 self-stretch flex items-center justify-center ${SOURCE_CARD_LG_THUMB}`;

/** 출처 상세(타임스탬프 · 회차 등) 한 줄 */
export const SOURCE_DETAIL = "text-[11px] text-muted-foreground/70 mt-1 leading-snug italic";

/**
 * 원본 장면 카드(OriginalSourceCards)가 사진 위 왼쪽 아래에 뜨는 자리 (기본값). 상세 페이지는 여기에 lg 클래스를 덧붙여 쓴다.
 * "use client" 파일이 아닌 여기 두어야 서버 컴포넌트(page.tsx)에서 문자열 그대로 가져올 수 있다
 */
export const ORIGINAL_CARDS_OVERLAY = "absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex gap-2 sm:gap-3 z-10";
