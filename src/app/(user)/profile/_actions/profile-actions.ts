"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeStorageExtractor, deleteStorageFiles } from "@/lib/storage";

const extractReCreeshotStoragePath = makeStorageExtractor("recreeshot-images");
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkNicknameAvailable } from "@/lib/actions/user-actions";

const extractProfileImageStoragePath = makeStorageExtractor("profile-images");

export async function updateProfile(data: {
  nickname: string;
  bio: string;
  profileImageUrl: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmedNickname = data.nickname.trim();
  if (trimmedNickname) {
    const available = await checkNicknameAvailable(trimmedNickname, user.id);
    if (!available) return { error: "This nickname is already taken." };
  }

  // 기존 프로필 이미지 URL 조회 (변경 시 Storage 정리용)
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profileImageUrl: true },
  });

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nickname: trimmedNickname || null,
        bio: data.bio.trim() || null,
        profileImageUrl: data.profileImageUrl,
      },
    });
  } catch {
    return { error: "Failed to update profile. Please try again." };
  }

  // 구 프로필 이미지 Storage 파일 삭제 (best-effort)
  const oldUrl = existingUser?.profileImageUrl;
  if (oldUrl && oldUrl !== data.profileImageUrl) {
    const storagePath = extractProfileImageStoragePath(oldUrl);
    if (storagePath) {
      await deleteStorageFiles("profile-images", [storagePath]);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return {};
}

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 삭제 전에 프로필 이미지 + 리크리샷 URL 조회
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      profileImageUrl: true,
      reCreeshots: { select: { imageUrl: true, referencePhotoUrl: true } },
    },
  });

  try {
    await prisma.user.delete({ where: { id: user.id } });
    await supabase.auth.signOut();
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);

    // 프로필 이미지 R2 파일 삭제 (best-effort)
    if (profile?.profileImageUrl) {
      const path = extractProfileImageStoragePath(profile.profileImageUrl);
      if (path) await deleteStorageFiles("profile-images", [path]);
    }

    // 리크리샷 이미지 R2 파일 삭제 (best-effort)
    if (profile?.reCreeshots?.length) {
      const paths = profile.reCreeshots
        .flatMap((s) => [s.imageUrl, s.referencePhotoUrl])
        .filter((url): url is string => !!url)
        .map(extractReCreeshotStoragePath)
        .filter((p): p is string => p !== null);
      if (paths.length > 0) await deleteStorageFiles("recreeshot-images", paths);
    }
  } catch {
    return { error: "Failed to delete account. Please try again." };
  }

  redirect("/");
}
