"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

export async function completeOnboarding({
  nickname,
  bio,
}: {
  nickname: string;
  bio: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmedNickname = nickname.trim();

  // 제출 시 중복 재확인
  if (trimmedNickname) {
    const existing = await prisma.user.findFirst({
      where: {
        nickname: { equals: trimmedNickname, mode: "insensitive" },
        id: { not: user.id },
      },
    });
    if (existing) return { error: "This nickname is already taken." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nickname: trimmedNickname || null,
      bio: bio.trim() || null,
      termsAcceptedAt: new Date(),
    },
  });

  await supabase.auth.updateUser({ data: { onboarded: true } });

  redirect("/");
}
