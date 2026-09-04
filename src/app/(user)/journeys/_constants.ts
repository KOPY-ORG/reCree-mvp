// 시안(docs/prototype/reCree Contest.dc.html — journeyView)의 색 토큰.
// 시안은 Pretendard / Open Sans 를 쓰지만 앱에는 두 폰트가 로드돼 있지 않다
// (globals.css: --font-sans = Geist Sans → Noto Sans KR).
// 그래서 폰트 패밀리는 앱 스택을 따르고 크기·굵기·행간·자간만 시안에 맞춘다.

export const INK = "#111111";
/** 스탯 카드·빈 Day 카드 배경 */
export const PAPER = "#F7F7F4";
/** 비활성 Day 탭 */
export const CHIP_BG = "#F4F4F1";
export const CHIP_FG = "#3B3B38";
/** 보조 텍스트 (작성자, 스탯 라벨) */
export const SUB = "#A3A3A0";
/** 빈 상태 본문 */
export const MUTED = "#96968F";
/** 아이템 행 구분선 */
export const LINE = "#F0F0EB";
/** 미니맵 자리표시 배경 */
export const MAP_BG = "#EDEBE6";

/** 아이템 출처 칩 — placeId 있음(앱 장소) / 없음(관광 데이터) */
export const SPOT_CHIP = { bg: "#F4FFD0", fg: "#4A5E06", label: "reCree spot" };
export const TOURISM_CHIP = { bg: "#F2F1EC", fg: "#8E8E8B", label: "Tourism data" };
