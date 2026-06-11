"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "ADMIN") return { error: "권한이 없습니다." };

  try {
    await prisma.user.delete({ where: { id: userId } });
    await getAdminClient().auth.admin.deleteUser(userId);
  } catch {
    return { error: "사용자 삭제에 실패했습니다." };
  }

  revalidatePath("/admin/users");
  return {};
}
