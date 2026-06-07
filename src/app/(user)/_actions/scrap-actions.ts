"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleEventScrap(
  eventId: string
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { saved: false, error: "unauthenticated" };
  }

  const userId = user.id;

  const existing = await prisma.save.findUnique({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType: "EVENT",
        targetId: eventId,
      },
    },
  });

  let saved: boolean;

  if (existing) {
    await prisma.$transaction([
      prisma.save.delete({ where: { id: existing.id } }),
      prisma.event.updateMany({
        where: { id: eventId, saveCount: { gt: 0 } },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);
    saved = false;
  } else {
    await prisma.$transaction([
      prisma.save.create({
        data: { userId, targetType: "EVENT", targetId: eventId },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);
    saved = true;
  }

  revalidatePath("/saved");
  return { saved };
}

export async function toggleScrap(
  postId: string
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { saved: false, error: "unauthenticated" };
  }

  const userId = user.id;

  const existing = await prisma.save.findUnique({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType: "POST",
        targetId: postId,
      },
    },
  });

  let saved: boolean;

  if (existing) {
    await prisma.$transaction([
      prisma.save.delete({ where: { id: existing.id } }),
      prisma.post.updateMany({
        where: { id: postId, saveCount: { gt: 0 } },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);
    saved = false;
  } else {
    await prisma.$transaction([
      prisma.save.create({
        data: { userId, targetType: "POST", targetId: postId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);
    saved = true;
  }

  revalidatePath("/saved");
  return { saved };
}
