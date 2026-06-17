"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkNicknameAvailable } from "@/lib/actions/user-actions";
import { nicknameSchema } from "@/lib/validators/user";

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

  const nickResult = nicknameSchema.safeParse(nickname);
  if (!nickResult.success) return { error: nickResult.error.issues[0]?.message ?? "Invalid nickname." };
  const trimmedNickname = nickResult.data;

  const available = await checkNicknameAvailable(trimmedNickname, user.id);
  if (!available) return { error: "This nickname is already taken." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nickname: trimmedNickname,
      bio: bio.trim() || null,
      termsAcceptedAt: new Date(),
    },
  });

  await supabase.auth.updateUser({ data: { onboarded: true } });

  redirect("/");
}
