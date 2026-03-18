"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ReportReason } from "@prisma/client";

export async function createReport(data: {
  reason: ReportReason;
  description?: string;
  postId?: string;
  reCreeshotId?: string;
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "unauthenticated" };

    // 본인 콘텐츠 신고 방지
    if (data.postId) {
      const post = await prisma.post.findUnique({
        where: { id: data.postId },
        select: { authorId: true },
      });
      if (post?.authorId === user.id) return { error: "own_content" };
    }
    if (data.reCreeshotId) {
      const shot = await prisma.reCreeshot.findUnique({
        where: { id: data.reCreeshotId },
        select: { userId: true },
      });
      if (shot?.userId === user.id) return { error: "own_content" };
    }

    // 같은 대상에 PENDING 신고가 이미 있으면 중복 방지
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        postId: data.postId ?? null,
        reCreeshotId: data.reCreeshotId ?? null,
        status: "PENDING",
      },
    });
    if (existing) return { error: "already_reported" };

    await prisma.$transaction(async (tx) => {
      await tx.report.create({
        data: {
          reason: data.reason,
          description: data.description ?? null,
          reporterId: user.id,
          postId: data.postId ?? null,
          reCreeshotId: data.reCreeshotId ?? null,
        },
      });

      // 리크리샷 신고 시 status를 REPORTED로 변경
      if (data.reCreeshotId) {
        await tx.reCreeshot.update({
          where: { id: data.reCreeshotId },
          data: { status: "REPORTED" },
        });
      }
    });

    if (data.reCreeshotId) {
      revalidatePath(`/explore/hall/${data.reCreeshotId}`);
    }

    return {};
  } catch {
    return { error: "server_error" };
  }
}
