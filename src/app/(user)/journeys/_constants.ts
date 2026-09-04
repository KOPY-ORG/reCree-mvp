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

/** 편집기 제목 입력 밑줄 (시안 editor :641) */
export const FIELD_LINE = "#EEEEE9";
/** 편집기 토글 off 트랙 · 빈 Day 점선 테두리 (시안 editor :649, :666) */
export const CONTROL_LINE = "#E2E2DC";

/** 아이템 출처 칩 — placeId 있음(앱 장소) / 없음(관광 데이터) */
export const SPOT_CHIP = { bg: "#F4FFD0", fg: "#4A5E06", label: "reCree spot" };
export const TOURISM_CHIP = { bg: "#F2F1EC", fg: "#8E8E8B", label: "Tourism data" };

/**
 * 스켈레톤 톤 — 시안(journey list :486, post detail :770)이 블록마다
 * 조금씩 옅은 회색을 겹쳐 쓴다. 아래로 갈수록 밝다.
 * 펄스는 Tailwind animate-pulse 를 쓴다 (shop/loading.tsx 선례).
 */
export const SKELETON_1 = "#EFEEE9";
export const SKELETON_2 = "#F3F2EE";
export const SKELETON_3 = "#F6F5F1";
