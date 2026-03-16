"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateMatchScore } from "@/lib/gemini";

// ─── createReCreeshot ────────────────────────────────────────────────────────

interface CreateReCreeshotData {
  imageUrl: string;
  referencePhotoUrl?: string;
  locationName?: string;
  story?: string;
  tips?: string;
  topicIds?: string[];
  tagIds?: string[];
}

export async function createReCreeshot(
  data: CreateReCreeshotData
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  try {
    const shot = await prisma.reCreeshot.create({
      data: {
        userId: user.id,
        imageUrl: data.imageUrl,
        referencePhotoUrl: data.referencePhotoUrl ?? null,
        locationName: data.locationName ?? null,
        story: data.story ?? null,
        tips: data.tips ?? null,
        reCreeshotTopics: data.topicIds?.length
          ? {
              create: data.topicIds.map((topicId) => ({ topicId })),
            }
          : undefined,
        reCreeshotTags: data.tagIds?.length
          ? {
              create: data.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
    });

    revalidatePath("/explore");
    return { id: shot.id };
  } catch (e) {
    console.error(e);
    return { error: "생성 실패" };
  }
}

// ─── scoreReCreeshot ─────────────────────────────────────────────────────────

export async function scoreReCreeshot(
  id: string
): Promise<{ matchScore: number } | { error: string }> {
  try {
    const shot = await prisma.reCreeshot.findUnique({
      where: { id },
      select: { imageUrl: true, referencePhotoUrl: true, matchScore: true },
    });

    if (!shot) return { error: "not found" };
    if (!shot.referencePhotoUrl) return { error: "no reference" };
    if (shot.matchScore !== null) return { matchScore: shot.matchScore }; // 이미 스코어 있으면 재계산 안 함

    const matchScore = await calculateMatchScore(
      shot.referencePhotoUrl,
      shot.imageUrl
    );

    await prisma.reCreeshot.update({
      where: { id },
      data: { matchScore, showBadge: true },
    });

    revalidatePath(`/explore/hall/${id}`);
    revalidatePath("/explore");
    return { matchScore };
  } catch (e) {
    console.error(e);
    return { error: "스코어링 실패" };
  }
}

// ─── toggleReCreeshotLike ────────────────────────────────────────────────────

export async function toggleReCreeshotLike(
  reCreeshotId: string
): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { liked: false, error: "unauthenticated" };

  const userId = user.id;

  const existing = await prisma.reCreeshotLike.findUnique({
    where: { userId_reCreeshotId: { userId, reCreeshotId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.reCreeshotLike.delete({ where: { id: existing.id } }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath(`/explore/hall/${reCreeshotId}`);
    return { liked: false };
  } else {
    await prisma.$transaction([
      prisma.reCreeshotLike.create({
        data: { userId, reCreeshotId },
      }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    revalidatePath(`/explore/hall/${reCreeshotId}`);
    return { liked: true };
  }
}

// ─── toggleReCreeshotSave ────────────────────────────────────────────────────

export async function toggleReCreeshotSave(
  reCreeshotId: string
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { saved: false, error: "unauthenticated" };

  const userId = user.id;

  const existing = await prisma.save.findUnique({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType: "RECREESHOT",
        targetId: reCreeshotId,
      },
    },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.save.delete({ where: { id: existing.id } }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath("/saved");
    return { saved: false };
  } else {
    await prisma.$transaction([
      prisma.save.create({
        data: { userId, targetType: "RECREESHOT", targetId: reCreeshotId },
      }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);
    revalidatePath("/saved");
    return { saved: true };
  }
}
