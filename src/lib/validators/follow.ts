import { z } from "zod";

export const topicIdSchema = z.string().uuid();

/**
 * 구독 순서 재배치 입력 — 사용자의 구독 토픽 id 전량을 원하는 순서대로.
 * 부분 목록을 허용하면 빠진 토픽의 sortOrder 를 무엇으로 둘지가 호출자마다 달라진다.
 * 길이·중복·소유권 검사는 액션이 DB 를 보고 한다.
 */
export const reorderFollowsSchema = z.array(z.string().uuid()).min(1).max(200);
