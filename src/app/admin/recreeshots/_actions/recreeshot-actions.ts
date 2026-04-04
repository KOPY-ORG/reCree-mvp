"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ReCreeshotStatus } from "@prisma/client";
import { makeStorageExtractor, deleteStorageFiles } from "@/lib/storage";

const extractReCreeStoragePath = makeStorageExtractor("recreeshot-images");

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

// 신고 처리 — 리크리샷 REPORT_HIDDEN 처리 (신고로 인한 숨김)
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
        data: { status: "REPORT_HIDDEN" },
      });
    }
  });
  revalidate();
}

// 관리자 삭제 — 소프트 딜리트 + Storage 파일 삭제
export async function adminDeleteRecreeshot(id: string) {
  const shot = await prisma.reCreeshot.findUnique({
    where: { id },
    select: { imageUrl: true, referencePhotoUrl: true },
  });
  if (!shot) return;

  await prisma.reCreeshot.update({ where: { id }, data: { status: "DELETED" } });

  const storagePaths = [shot.imageUrl, shot.referencePhotoUrl]
    .filter((url): url is string => !!url)
    .map(extractReCreeStoragePath)
    .filter((p): p is string => p !== null);
  if (storagePaths.length > 0) {
    await deleteStorageFiles("recreeshot-images", storagePaths);
  }

  revalidate();
}

// 신고 되돌리기 — PENDING으로 복원, 리크리샷 REPORTED로 복원
export async function restoreReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { reCreeshotId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "PENDING", resolvedAt: null },
    });
    if (report?.reCreeshotId) {
      await tx.reCreeshot.update({
        where: { id: report.reCreeshotId },
        data: { status: "REPORTED" },
      });
    }
  });
  revalidate();
}
