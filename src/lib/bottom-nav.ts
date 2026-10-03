// ─── 플로팅 탭바 기하 ─────────────────────────────────────────────────────────
// Figma Bottom_Tap_ver01 에서 표면(흰색 93% · 테두리 · 그림자 · blur)과 색만 가져왔다.
// ver01 의 세로 펼침(58×114)과 75px 칸은 쓰지 않는다 — 아래 BOTTOM_NAV_ITEM 참고.
//
// 탭바가 sticky flex 항목에서 오버레이로 바뀌면서 "탭바가 먹는 높이"를 알아야 하는 곳이
// 17개 파일로 늘었다 (지도 높이 · 시트 높이와 스냅 · FAB · 맨위로 · sticky CTA · 토스트).
// 값은 여기 한 곳에만 둔다.
//
// CSS 짝은 globals.css 의 --bottom-nav-* 변수다. 둘 중 무엇을 쓸지는 이렇게 나눈다.
//   className 문자열 · style 값  → var(--bottom-nav-space)  (safe-area 포함, 정확)
//   JS 계산 (지도 패딩 · 스냅)    → 아래 숫자                (safe-area 제외, 근사)

/** 아이콘 한 변. 가이드 SVG 가 24 그리드에 그려져 있어 원래 크기다 */
export const BOTTOM_NAV_ICON = 24;

/**
 * 탭바 아이콘 선 굵기 (viewBox 단위). 여섯 아이콘이 모두 이 값 하나를 쓴다.
 *
 * 가이드 원본은 2.0 인데 탭바에서는 1.75 로 내린다. 크기(24)는 그대로 두고 선만 가늘게 한다.
 * (1.5 는 실제 화면에서 얇게 읽혀 한 단계 올렸다)
 * 선으로 그린 아이콘(Home · Journeys)은 stroke-width 로, 선을 면으로 굳힌 넷(Camera · Map · Shop · User)은
 * 벡터 마스크로 같은 굵기를 만든다 (components/icons/OutlinePath.tsx).
 *
 * 예전에는 렌더된 모양을 feMorphology 필터로 깎았는데, 픽셀을 깎는 방식이라
 * 화면 밀도(1x · 2x · 3x)와 렌더러마다 굵기가 달라 어떤 화면에서는 1px 가까이 얇아졌다.
 */
export const BOTTOM_NAV_ICON_STROKE = 1.75;

/**
 * 프로필 아바타 지름. 아이콘보다 크다.
 *
 * 선으로 그린 아이콘은 24 상자 안에서 팔다리가 끝까지 뻗어 그만큼 커 보이는데,
 * 사진은 원 안에 갇힌 덩어리라 같은 24 여도 작은 점으로 읽힌다.
 * 32 면 옆 아이콘들과 시각적 무게가 맞고, 활성일 때 라임이 8px 링으로 남는다.
 */
export const BOTTOM_NAV_AVATAR = 32;

/**
 * 칸 한 변. 라벨이 없어 정사각이고, 활성 표시는 이 칸을 채우는 라임 원이 된다.
 * 여기에 알약 안쪽 여백 5(=4+테두리 1)를 위아래로 더하면 알약 높이 58 이 되고,
 * 칸의 반지름 24 는 알약 모서리 29 와 정확히 동심원이 된다.
 *
 * 시안은 75 다. 그건 라벨(recreeshot ≈ 51 + 좌우 12)이 정한 폭이라 라벨을 빼면서
 * 제약 자체가 사라졌다. 애초에 라벨을 유지했더라도 75 는 못 썼다 —
 * 홈/맵이 가로로 들어가면 360px 에 다섯 칸이 필요한데,
 * 75 로는 좌우 알약이 51px 겹친다(좌 219 + 우 152 = 371 > 가용 320).
 */
export const BOTTOM_NAV_ITEM = 48;

/**
 * 칸 사이. 0 이다 — 활성 원은 한 번에 하나라 이웃 원과 붙을 일이 없다.
 * 왼쪽 알약이 4칸(Profile · Shop · recreeshots · Journeys)이 되면서 360px 에서 두 알약이 맞닿아
 * 하나로 읽혔다. 칸 크기(48) · 아이콘(24) · 높이(58)는 그대로 두고 간격만 뺐다.
 * 360px 가용 320 = 좌 202 + 우 106 + 사이 12.
 */
export const BOTTOM_NAV_ITEM_GAP = 0;

/** 알약 안쪽 여백 (테두리 1px 은 별도) */
export const BOTTOM_NAV_PAD = 4;

/** 알약 높이. 48 + 4·2 + 테두리 1·2 */
export const BOTTOM_NAV_PILL_H = BOTTOM_NAV_ITEM + BOTTOM_NAV_PAD * 2 + 2; // 58

/** 화면 가장자리에서 탭바까지. 좌·우·아래가 같아야 "떠 있는 물체"로 읽힌다 */
export const BOTTOM_NAV_INSET = 20;

/** 탭바와 콘텐츠 사이 최소 간격 */
export const BOTTOM_NAV_GAP = 12;

/**
 * 탭바가 콘텐츠에서 가져가는 세로 공간.
 *
 * env(safe-area-inset-bottom) 은 빠져 있다 — CSS 에서만 더할 수 있기 때문이다.
 * 그래서 이 숫자는 지도 카메라 패딩이나 시트 드래그 스냅 임계처럼
 * 몇십 px 오차가 눈에 보이지 않는 계산에만 쓴다.
 */
export const BOTTOM_NAV_SPACE = BOTTOM_NAV_INSET + BOTTOM_NAV_PILL_H + BOTTOM_NAV_GAP; // 90

/**
 * lg(≥1024) 에서 탭바가 가져가는 세로 공간. 알약이 상단 바로 옮겨 가서
 * 떠 있는 요소가 바닥에서 띄우는 24 만 남는다 (globals.css 의 lg --bottom-nav-space 와 짝).
 */
export const BOTTOM_NAV_SPACE_LG = 24;

/**
 * lg 레이아웃(상단 바 · 지도 옆 패널)인지.
 *
 * 렌더에는 쓰지 않는다 — SSR 과 첫 페인트가 어긋난다. 화면 배치는 전부 lg: 클래스가 맡고,
 * 이 함수는 지도 카메라 여백 · 시트 스냅처럼 이벤트 · effect 안에서 도는 JS 계산에만 쓴다.
 */
export function isRailLayout(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 64rem)").matches;
}

/** JS 계산용 탭바 공간. 모바일은 BOTTOM_NAV_SPACE 그대로다 */
export function bottomNavSpace(): number {
  return isRailLayout() ? BOTTOM_NAV_SPACE_LG : BOTTOM_NAV_SPACE;
}

/**
 * 모바일에서만 탭바를 숨기는 화면. lg 에서는 같은 컴포넌트가 상단 바라 그대로 둔다.
 * 게시글 상세는 읽는 화면이라 아래를 비우고, 그 자리를 View on Map 같은 화면 고유 버튼이 쓴다.
 * 이 화면에서 아래에 뜨는 것들은 --bottom-nav-space 대신 화면 아래(--bottom-nav-bottom)에 붙는다.
 */
export function isBottomNavHiddenOnMobile(pathname: string): boolean {
  return pathname.startsWith("/posts/");
}

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
 * PC(lg+) 상단 바(DesktopHeader)를 숨기는 화면 — 만드는 흐름(편집기 · 온보딩)만.
 * 모바일 탭바와 기준이 다르다. recreeshot 상세 · 약관 같은 읽는 화면은 모바일에서는
 * 탭바를 치우지만 PC 에서는 상단 바가 그대로 길을 잡는다.
 */
export function isDesktopHeaderHidden(pathname: string): boolean {
  return (
    pathname === "/recreeshot/new" ||
    pathname.endsWith("/edit") ||
    pathname === "/journeys/new" ||
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

/**
 * 탭바를 잠깐 치운다. 경로로는 알 수 없는 상태 — 지도 시트를 끝까지 올렸을 때다.
 *
 * React state 로 올리지 않고 <html> 속성으로 둔다. 탭바는 레이아웃의 형제라
 * state 를 태우려면 provider 로 (user) 트리 전체를 감싸야 하는데, 그러면 시트를
 * 드래그하는 동안 지도까지 리렌더된다. 여기서 필요한 건 표시 여부 하나뿐이고
 * 그건 CSS 가 혼자 처리할 수 있다 — globals.css 의 [data-nav-tucked] 를 보라.
 */
export function setBottomNavTucked(tucked: boolean): void {
  document.documentElement.toggleAttribute("data-nav-tucked", tucked);
}
