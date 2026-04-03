"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeStorageExtractor, deleteStorageFiles } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkNicknameAvailable } from "@/lib/actions/user-actions";

const extractProfileImageStoragePath = makeStorageExtractor("profile-images");

async function ensureProfileImagesBucket(): Promise<void> {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "profile-images");
  if (!exists) {
    await admin.storage.createBucket("profile-images", { public: true });
  }
}

export async function uploadProfileImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  try {
    await ensureProfileImagesBucket();

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("profile-images")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (error) return { error: "Failed to upload image." };

    const { data } = admin.storage.from("profile-images").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch {
    return { error: "Failed to upload image." };
  }
}

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

  try {
    await prisma.user.delete({ where: { id: user.id } });
    await supabase.auth.signOut();
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);

    // profile-images/${userId}/ 폴더 내 파일 삭제 (best-effort)
    try {
      const { data: files } = await admin.storage.from("profile-images").list(user.id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await deleteStorageFiles("profile-images", paths);
      }
    } catch (e) {
      console.error("프로필 이미지 Storage 폴더 삭제 오류:", e);
    }
  } catch {
    return { error: "Failed to delete account. Please try again." };
  }

  redirect("/");
}
