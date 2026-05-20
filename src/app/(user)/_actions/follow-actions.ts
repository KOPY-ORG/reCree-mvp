"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { topicIdSchema } from "@/lib/validators/follow";

/**
 * Follow/unfollow 후 영향받는 캐시 경로 무효화.
 * - "/" : 홈 For You 섹션
 * - "/discover" : 디폴트 필터
 * - "/profile/following" : 팔로우 목록
 * - "/topics/[slug]" : 토픽 상세 페이지 (PR-3에서 생성)
 */
function revalidateFollowPaths() {
  revalidatePath("/");
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
      select: { id: true, isActive: true },
    });
    if (!topic || !topic.isActive) {
      return { error: "not_found" };
    }

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