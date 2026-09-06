// ─── 플로팅 탭바 기하 ─────────────────────────────────────────────────────────
// 탭바가 sticky flex 항목에서 오버레이로 바뀌면서 "탭바가 먹는 높이"를 알아야 하는 곳이
// 아홉 군데로 늘었다 (지도 높이 · 시트 높이와 스냅 · FAB · 맨위로 · sticky CTA · 토스트).
// 전에는 같은 숫자 64 를 세 파일이 따로 적고 있었고 그게 어긋남의 원인이었다.
// 값은 여기 한 곳에만 둔다.
//
// CSS 짝은 globals.css 의 --bottom-nav-* 변수다. 둘 중 무엇을 쓸지는 이렇게 나눈다.
//   className 문자열 · style 값  → var(--bottom-nav-space)  (safe-area 포함, 정확)
//   JS 계산 (지도 패딩 · 스냅)    → 아래 숫자                (safe-area 제외, 근사)

/** 아이콘 버튼 한 변. 44 가 최소선이고 48 은 Material 권장선이다 */
export const BOTTOM_NAV_BUTTON = 48;

/** 알약 안쪽 여백 */
export const BOTTOM_NAV_PADDING = 6;

/** 알약 높이 */
export const BOTTOM_NAV_PILL_H = BOTTOM_NAV_BUTTON + BOTTOM_NAV_PADDING * 2; // 60

/** 화면 가장자리에서 탭바까지. 좌·우·아래가 같아야 "떠 있는 물체"로 읽힌다 */
export const BOTTOM_NAV_INSET = 16;

/** 탭바와 콘텐츠 사이 최소 간격 */
export const BOTTOM_NAV_GAP = 12;

/**
 * 탭바가 콘텐츠에서 가져가는 세로 공간.
 *
 * env(safe-area-inset-bottom) 은 빠져 있다 — CSS 에서만 더할 수 있기 때문이다.
 * 그래서 이 숫자는 지도 카메라 패딩이나 시트 드래그 스냅 임계처럼
 * 몇십 px 오차가 눈에 보이지 않는 계산에만 쓴다.
 * 실제로 그려지는 높이는 전부 CSS 변수를 쓰므로 기기에서 정확하다.
 */
export const BOTTOM_NAV_SPACE = BOTTOM_NAV_INSET + BOTTOM_NAV_PILL_H + BOTTOM_NAV_GAP; // 88

/**
 * 탭바를 숨기는 화면.
 * ConditionalBottomNav 가 쓰던 조건 그대로다 — main 하단 여백도 같은 판정을 써야
 * "탭바는 없는데 아래가 비어 있는" 화면이 생기지 않는다.
 */
export function isBottomNavHidden(pathname: string): boolean {
  return (
    pathname.startsWith("/recreeshot/") ||
    pathname.endsWith("/edit") ||
    // 코스 편집기의 create 진입점. endsWith("/edit") 가 못 잡는데, 제목 입력 후
    // /journeys/{id}/edit 로 replace 되므로 여기서 빼지 않으면 그 순간 탭바가 사라진다.
    pathname === "/journeys/new" ||
    pathname.startsWith("/policy/") ||
    pathname === "/onboarding"
  );
}

/**
 * 자기 높이를 스스로 관리하는 화면. main 에 하단 여백을 주지 않는다.
 *
 * 지도는 탭바가 지도 위에 떠야 반투명·blur·그림자가 의미를 갖는다.
 * 여백을 주면 지도 아래에 흰 띠가 생기고 그 위에 흰 알약이 놓여 아무것도 안 보인다.
 * 대신 지도 안의 시트·FAB 가 각자 var(--bottom-nav-space) 만큼 올라간다.
 */
export function isFullBleedScreen(pathname: string): boolean {
  return pathname === "/discover";
}
