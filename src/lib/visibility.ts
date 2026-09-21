// 사용자 화면의 공개 노출 조건 — 서버 전용
//
// "이 콘텐츠를 비로그인 사용자에게 보여도 되는가" 하나만 담는다.
// 목록마다 더 붙는 조건(토픽·지역·저장 여부)은 각 쿼리가 스프레드로 합친다.
//
// 한곳에 두는 이유: 같은 판단이 화면마다 흩어져 있으면 한쪽만 고쳐져
// 홈에서는 안 보이는 포스트가 인기 목록에는 나오는 식으로 어긋난다.
import type { Prisma } from "@prisma/client";

// 샵 포스트 제외. 샵까지 포함하려면 status 조건만 따로 쓸 것
// TODO: 이름과 달리 placeId 조건이 없다. 별도 이슈에서 결정
export const PUBLIC_PLACE_POST_WHERE = {
  status: "PUBLISHED",
  isShop: false,
} satisfies Prisma.PostWhereInput;

/** 공개된 리크리샷. 신고·숨김·삭제 상태는 전부 빠진다 */
export const PUBLIC_RECREESHOT_WHERE = {
  status: "ACTIVE",
} satisfies Prisma.ReCreeshotWhereInput;
