"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ReCreeshotStatus } from "@prisma/client";

function revalidate() {
  revalidatePath("/admin/recreeshots");
}

export async function setRecreeshotStatus(id: string, status: ReCreeshotStatus) {
  await prisma.reCreeshot.update({ where: { id }, data: { status } });
  revalidate();
}

// 신고 기각 — 리크리샷 status를 ACTIVE로 복원
export async function dismissReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { reCreeshotId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED", resolvedAt: new Date() },
    });
    if (report?.reCreeshotId) {
      await tx.reCreeshot.update({
        where: { id: report.reCreeshotId },
        data: { status: "ACTIVE" },
      });
    }
  });
  revalidate();
}

// 신고 처리 — 리크리샷 숨김 처리
export async function resolveReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { reCreeshotId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    if (report?.reCreeshotId) {
      await tx.reCreeshot.update({
        where: { id: report.reCreeshotId },
        data: { status: "HIDDEN" },
      });
    }
  });
  revalidate();
}
