"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkNicknameAvailable } from "@/lib/actions/user-actions";

export { checkNicknameAvailable };

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

  if (trimmedNickname) {
    const available = await checkNicknameAvailable(trimmedNickname, user.id);
    if (!available) return { error: "This nickname is already taken." };
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
