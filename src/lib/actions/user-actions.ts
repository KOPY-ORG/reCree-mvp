"use server";

import { prisma } from "@/lib/prisma";

export async function checkNicknameAvailable(
  nickname: string,
  excludeUserId?: string
): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;
  const existing = await prisma.user.findFirst({
    where: {
      nickname: { equals: trimmed, mode: "insensitive" },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
  return !existing;
}
