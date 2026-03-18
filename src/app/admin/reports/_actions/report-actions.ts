"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/admin/reports");
}

// 신고 기각
export async function dismissPostReport(reportId: string) {
  await prisma.report.update({
    where: { id: reportId },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  revalidate();
}

// 신고 처리완료 (포스트는 자동 숨김 없음 — 관리자가 직접 처리)
export async function resolvePostReport(reportId: string) {
  await prisma.report.update({
    where: { id: reportId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  revalidate();
}
