"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/admin/reports");
}

// 신고 기각 — 포스트 그대로 유지
export async function dismissPostReport(reportId: string) {
  await prisma.report.update({
    where: { id: reportId },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  revalidate();
}

// 신고 처리완료 — 포스트 DRAFT로 변경 (사용자 화면에서 숨김)
export async function resolvePostReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { postId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    if (report?.postId) {
      await tx.post.update({
        where: { id: report.postId },
        data: { status: "DRAFT" },
      });
    }
  });
  revalidate();
  revalidatePath("/admin/posts");
}

// 신고 되돌리기 — PENDING으로 복원, 처리완료였으면 포스트도 PUBLISHED로 복원
export async function restorePostReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { postId: true, status: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "PENDING", resolvedAt: null },
    });
    if (report?.status === "RESOLVED" && report.postId) {
      await tx.post.update({
        where: { id: report.postId },
        data: { status: "PUBLISHED" },
      });
    }
  });
  revalidate();
  revalidatePath("/admin/posts");
}
