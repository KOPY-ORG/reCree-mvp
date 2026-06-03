"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath("/admin/events");
    return {};
  } catch (e) {
    console.error("이벤트 삭제 오류:", e);
    return { error: "이벤트를 삭제하는 중 오류가 발생했습니다." };
  }
}
