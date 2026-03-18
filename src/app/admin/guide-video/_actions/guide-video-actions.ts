"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveGuideVideo(data: {
  videoUrl: string;
  thumbnailUrl: string;
  titleEn: string;
}) {
  // 기존 활성 영상 비활성화 후 새로 등록
  await prisma.guideVideo.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  await prisma.guideVideo.create({
    data: {
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl || null,
      titleEn: data.titleEn || "How to reCree",
      isActive: true,
    },
  });

  revalidatePath("/admin/guide-video");
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function toggleGuideVideo(id: string, isActive: boolean) {
  if (isActive) {
    // 활성화: 기존 모두 비활성화 후 이 영상 활성화
    await prisma.guideVideo.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await prisma.guideVideo.update({ where: { id }, data: { isActive: true } });
  } else {
    await prisma.guideVideo.update({ where: { id }, data: { isActive: false } });
  }

  revalidatePath("/admin/guide-video");
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function deleteGuideVideo(id: string) {
  await prisma.guideVideo.delete({ where: { id } });
  revalidatePath("/admin/guide-video");
  revalidatePath("/");
  revalidatePath("/explore");
}
