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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

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
}
