"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ContentType, SectionType } from "@prisma/client";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type SectionFormData = {
  titleEn: string;
  titleKo: string;
  subtitleEn?: string;
  subtitleKo?: string;
  contentType: ContentType;
  type: SectionType;
  postIds: string[];
  filterTopicId?: string;
  filterTagId?: string;
  maxCount: number;
  isActive: boolean;
};

function revalidate() {
  revalidatePath("/admin/home-curation");
  revalidatePath("/");
}

// ─── 배너 액션 ────────────────────────────────────────────────────────────────

export async function addBanner(postId: string) {
  const existing = await prisma.homeBanner.findFirst({ where: { postId } });
  if (existing) return;
  const max = await prisma.homeBanner.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.homeBanner.create({
    data: { postId, order: (max?.order ?? 0) + 1 },
  });
  revalidate();
}

export async function removeBanner(bannerId: string) {
  await prisma.homeBanner.delete({ where: { id: bannerId } });
  revalidate();
}

export async function reorderBanners(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      prisma.homeBanner.update({ where: { id }, data: { order: i } })
    )
  );
  revalidate();
}

export async function toggleBannerActive(bannerId: string, isActive: boolean) {
  await prisma.homeBanner.update({ where: { id: bannerId }, data: { isActive } });
  revalidate();
}

export type LabelOverride = { type: "topic" | "tag"; id: string };

export async function updateBannerLabels(bannerId: string, overrides: LabelOverride[]) {
  await prisma.homeBanner.update({
    where: { id: bannerId },
    data: { labelOverrides: overrides.length > 0 ? overrides : Prisma.DbNull },
  });
  revalidate();
}

// ─── 섹션 액션 ────────────────────────────────────────────────────────────────

export async function createSection(data: SectionFormData) {
  const max = await prisma.curatedSection.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.curatedSection.create({
    data: {
      titleEn: data.titleEn,
      titleKo: data.titleKo,
      subtitleEn: data.subtitleEn || null,
      subtitleKo: data.subtitleKo || null,
      contentType: data.contentType,
      type: data.type,
      postIds: data.postIds,
      filterTopicId: data.filterTopicId || null,
      filterTagId: data.filterTagId || null,
      maxCount: data.maxCount,
      isActive: data.isActive,
      order: (max?.order ?? 0) + 1,
    },
  });
  revalidate();
}

export async function updateSection(id: string, data: SectionFormData) {
  await prisma.curatedSection.update({
    where: { id },
    data: {
      titleEn: data.titleEn,
      titleKo: data.titleKo,
      subtitleEn: data.subtitleEn || null,
      subtitleKo: data.subtitleKo || null,
      contentType: data.contentType,
      type: data.type,
      postIds: data.postIds,
      filterTopicId: data.filterTopicId || null,
      filterTagId: data.filterTagId || null,
      maxCount: data.maxCount,
      isActive: data.isActive,
    },
  });
  revalidate();
}

export async function deleteSection(id: string) {
  await prisma.curatedSection.delete({ where: { id } });
  revalidate();
}

export async function reorderSections(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      prisma.curatedSection.update({ where: { id }, data: { order: i } })
    )
  );
  revalidate();
}

export async function toggleSectionActive(id: string, isActive: boolean) {
  await prisma.curatedSection.update({ where: { id }, data: { isActive } });
  revalidate();
}
