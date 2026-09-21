"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { reorderFollowsSchema, topicIdSchema } from "@/lib/validators/follow";

/**
 * Follow/unfollow 후 영향받는 캐시 경로 무효화.
 * - "/feed" : 홈 For You 섹션
 * - "/discover" : 디폴트 필터
 * - "/profile/following" : 팔로우 목록
 * - "/topics/[slug]" : 토픽 상세 페이지 (PR-3에서 생성)
 */
function revalidateFollowPaths() {
  revalidatePath("/feed");
  revalidatePath("/discover");
  revalidatePath("/profile/following");
  revalidatePath("/topics/[slug]", "page");
}

export async function followTopic(
  topicId: string
): Promise<{ error?: string }> {
  const parsed = topicIdSchema.safeParse(topicId);
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const topic = await prisma.topic.findUnique({
      where: { id: parsed.data },
      select: { id: true, isActive: true, level: true },
    });
    if (!topic || !topic.isActive) {
      return { error: "not_found" };
    }
    // 구독은 L2(그룹·작품)만이다. 멤버(L3)나 상위 카테고리(L0·L1)는 탭이 되지 않는다.
    // 페이지가 L2 카드만 보여주더라도 액션은 스스로 막아야 한다.
    if (topic.level !== 2) {
      return { error: "invalid_input" };
    }

    // 새 구독은 맨 뒤로. 이미 구독 중이면 update 를 비워 둬 순서를 건드리지 않는다.
    const last = await prisma.topicFollow.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextSortOrder = last ? last.sortOrder + 1 : 0;

    await prisma.topicFollow.upsert({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId: parsed.data,
        },
      },
      create: {
        userId: user.id,
        topicId: parsed.data,
        sortOrder: nextSortOrder,
      },
      update: {},
    });

    revalidateFollowPaths();

    return {};
  } catch (error) {
    console.error("[followTopic] server_error", error);
    return { error: "server_error" };
  }
}

export async function unfollowTopic(
  topicId: string
): Promise<{ error?: string }> {
  const parsed = topicIdSchema.safeParse(topicId);
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    await prisma.topicFollow.deleteMany({
      where: {
        userId: user.id,
        topicId: parsed.data,
      },
    });

    revalidateFollowPaths();

    return {};
  } catch (error) {
    console.error("[unfollowTopic] server_error", error);
    return { error: "server_error" };
  }
}

/**
 * 구독 순서 재배치. 넘어온 순서대로 sortOrder 를 0..n-1 로 다시 쓴다.
 *
 * 입력은 그 사용자의 구독 토픽 **전량**이라야 한다 — 부분 목록·남의 토픽·중복은 거부한다.
 * 부분 목록을 받아주면 빠진 토픽이 어디로 가야 하는지가 호출자마다 달라지고,
 * 결국 화면과 DB 가 서로 다른 순서를 믿게 된다.
 */
export async function reorderFollows(
  topicIds: string[]
): Promise<{ error?: string }> {
  const parsed = reorderFollowsSchema.safeParse(topicIds);
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const ordered = parsed.data;
  if (new Set(ordered).size !== ordered.length) {
    return { error: "invalid_input" };
  }

  try {
    const follows = await prisma.topicFollow.findMany({
      where: { userId: user.id },
      select: { topicId: true },
    });

    // 전량 일치 검사 — 개수가 같고 모든 id 가 내 구독이면 두 집합은 같다
    if (follows.length !== ordered.length) {
      return { error: "invalid_input" };
    }
    const mine = new Set(follows.map((f) => f.topicId));
    if (ordered.some((id) => !mine.has(id))) {
      return { error: "invalid_input" };
    }

    await prisma.$transaction(
      ordered.map((topicId, index) =>
        prisma.topicFollow.update({
          where: { userId_topicId: { userId: user.id, topicId } },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath("/feed");

    return {};
  } catch (error) {
    console.error("[reorderFollows] server_error", error);
    return { error: "server_error" };
  }
}
