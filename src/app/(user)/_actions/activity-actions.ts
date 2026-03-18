"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function trackDailyActivity() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyActiveUser.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: { userId: user.id, date: today },
      update: {},
    });
  } catch {
    // 추적 실패는 무시
  }
}
