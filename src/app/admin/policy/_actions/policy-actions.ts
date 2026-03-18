"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePolicy(id: "terms" | "privacy", content: string) {
  await prisma.policy.upsert({
    where: { id },
    create: { id, content },
    update: { content },
  });
  revalidatePath("/admin/policy");
  revalidatePath("/policy/terms");
  revalidatePath("/policy/privacy");
}
