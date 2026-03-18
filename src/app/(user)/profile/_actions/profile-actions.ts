"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureProfileImagesBucket(): Promise<void> {
  const admin = getAdminClient();
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

  await ensureProfileImagesBucket();

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const admin = getAdminClient();
  const { error } = await admin.storage
    .from("profile-images")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (error) return { error: "Failed to upload image." };

  const { data } = admin.storage.from("profile-images").getPublicUrl(path);
  return { url: data.publicUrl };
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

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nickname: data.nickname.trim() || null,
        bio: data.bio.trim() || null,
        profileImageUrl: data.profileImageUrl,
      },
    });
  } catch {
    return { error: "Failed to update profile. Please try again." };
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
    await getAdminClient().auth.admin.deleteUser(user.id);
  } catch {
    return { error: "Failed to delete account. Please try again." };
  }

  redirect("/");
}
