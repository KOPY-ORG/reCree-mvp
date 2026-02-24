"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TopicType } from "@prisma/client";

/**
 * Topic 순서를 일괄 업데이트합니다.
 * orderedIds: 새로운 순서대로 정렬된 id 배열 (index → sortOrder)
 */
export async function reorderTopics(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.topic.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/admin/categories");
}

// ─── CRUD 공통 타입 ──────────────────────────────────────────────────────────

export type TopicFormData = {
  nameKo: string;
  nameEn: string;
  slug: string;
  type: TopicType;
  subtype?: string;
  parentId?: string | null;
  colorHex: string | null;
  colorHex2: string | null;  // 그라데이션 끝 색 (null = 단색)
  textColorHex: string | null;
  isActive: boolean;
};

// ─── 생성 ─────────────────────────────────────────────────────────────────────

export async function createTopic(
  data: TopicFormData
): Promise<{ error?: string }> {
  try {
    // 같은 parentId 그룹의 마지막 sortOrder + 1
    const siblings = await prisma.topic.findMany({
      where: { parentId: data.parentId ?? null },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    const nextSortOrder =
      siblings.length > 0 ? siblings[0].sortOrder + 1 : 0;

    // level 계산: parentId 있으면 parent.level + 1, 없으면 0
    let level = 0;
    if (data.parentId) {
      const parent = await prisma.topic.findUnique({
        where: { id: data.parentId },
        select: { level: true },
      });
      level = (parent?.level ?? 0) + 1;
    }

    await prisma.topic.create({
      data: {
        nameKo: data.nameKo,
        nameEn: data.nameEn,
        slug: data.slug,
        type: data.type,
        subtype: data.subtype || null,
        parentId: data.parentId || null,
        level,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        textColorHex: data.textColorHex,
        isActive: data.isActive,
        sortOrder: nextSortOrder,
      },
    });

    revalidatePath("/admin/categories");
    return {};
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "이미 사용 중인 slug입니다." };
    }
    return { error: "생성 중 오류가 발생했습니다." };
  }
}

// ─── 수정 ─────────────────────────────────────────────────────────────────────

export async function updateTopic(
  id: string,
  data: TopicFormData
): Promise<{ error?: string }> {
  try {
    // level 재계산
    let level = 0;
    if (data.parentId) {
      const parent = await prisma.topic.findUnique({
        where: { id: data.parentId },
        select: { level: true },
      });
      level = (parent?.level ?? 0) + 1;
    }

    await prisma.topic.update({
      where: { id },
      data: {
        nameKo: data.nameKo,
        nameEn: data.nameEn,
        slug: data.slug,
        type: data.type,
        subtype: data.subtype || null,
        parentId: data.parentId || null,
        level,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        textColorHex: data.textColorHex,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/categories");
    return {};
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "이미 사용 중인 slug입니다." };
    }
    return { error: "수정 중 오류가 발생했습니다." };
  }
}

// ─── 삭제 ─────────────────────────────────────────────────────────────────────

export async function deleteTopic(
  id: string
): Promise<{ error?: string }> {
  try {
    const childCount = await prisma.topic.count({ where: { parentId: id } });
    if (childCount > 0) {
      return { error: `자식 항목이 ${childCount}개 있어 삭제할 수 없습니다. 먼저 자식을 삭제해주세요.` };
    }

    await prisma.topic.delete({ where: { id } });

    revalidatePath("/admin/categories");
    return {};
  } catch {
    return { error: "삭제 중 오류가 발생했습니다." };
  }
}
