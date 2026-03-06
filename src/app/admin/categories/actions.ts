"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  parentId?: string | null;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
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
        parentId: data.parentId || null,
        level,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        gradientDir: data.gradientDir,
        gradientStop: data.gradientStop,
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

async function getDescendantIds(topicId: string): Promise<string[]> {
  const children = await prisma.topic.findMany({
    where: { parentId: topicId },
    select: { id: true },
  });
  const ids = children.map((c) => c.id);
  for (const child of children) {
    ids.push(...(await getDescendantIds(child.id)));
  }
  return ids;
}

async function updateDescendantLevels(topicId: string, parentLevel: number): Promise<void> {
  const childLevel = parentLevel + 1;
  const children = await prisma.topic.findMany({
    where: { parentId: topicId },
    select: { id: true },
  });
  if (children.length === 0) return;
  await prisma.topic.updateMany({
    where: { parentId: topicId },
    data: { level: childLevel },
  });
  for (const child of children) {
    await updateDescendantLevels(child.id, childLevel);
  }
}

export async function updateTopic(
  id: string,
  data: TopicFormData
): Promise<{ error?: string }> {
  try {
    // 순환 참조 방지
    if (data.parentId && data.parentId !== id) {
      const descendants = await getDescendantIds(id);
      if (descendants.includes(data.parentId)) {
        return { error: "자신의 자손을 부모로 설정할 수 없습니다." };
      }
    }

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
        parentId: data.parentId || null,
        level,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        gradientDir: data.gradientDir,
        gradientStop: data.gradientStop,
        textColorHex: data.textColorHex,
        isActive: data.isActive,
      },
    });

    // 자손 level 일괄 업데이트
    await updateDescendantLevels(id, level);
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

// ═══════════════════════════════════════════════════════════════════════════════
// Tag CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export type TagFormData = {
  name: string;
  nameKo: string;
  slug: string;
  group: string;
  colorHex: string | null;      // null = 그룹 색 상속
  colorHex2: string | null;
  textColorHex: string | null;  // null = 그룹 색 상속
  isActive: boolean;
};

export type TagGroupConfigFormData = {
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

export async function reorderTags(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.tag.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/admin/categories");
}

export type TagSavedData = {
  id: string;
  name: string;
  nameKo: string;
  slug: string;
  group: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
  isActive: boolean;
  sortOrder: number;
};

export async function createTag(data: TagFormData): Promise<{ error?: string; created?: TagSavedData }> {
  try {
    const siblings = await prisma.tag.findMany({
      where: { group: data.group },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    const nextSortOrder = siblings.length > 0 ? siblings[0].sortOrder + 1 : 0;

    const created = await prisma.tag.create({
      data: {
        name: data.name,
        nameKo: data.nameKo,
        slug: data.slug,
        group: data.group,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        textColorHex: data.textColorHex,
        isActive: data.isActive,
        sortOrder: nextSortOrder,
      },
      select: { id: true, name: true, nameKo: true, slug: true, group: true, colorHex: true, colorHex2: true, textColorHex: true, isActive: true, sortOrder: true },
    });

    revalidatePath("/admin/categories");
    return { created };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "이미 사용 중인 slug입니다." };
    }
    if (msg.includes("Unique constraint") && msg.includes("name")) {
      return { error: "이미 사용 중인 name(영어)입니다." };
    }
    return { error: "생성 중 오류가 발생했습니다." };
  }
}

export async function updateTag(id: string, data: TagFormData): Promise<{ error?: string; updated?: TagSavedData }> {
  try {
    const updated = await prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        nameKo: data.nameKo,
        slug: data.slug,
        group: data.group,
        colorHex: data.colorHex,
        colorHex2: data.colorHex2,
        textColorHex: data.textColorHex,
        isActive: data.isActive,
      },
      select: { id: true, name: true, nameKo: true, slug: true, group: true, colorHex: true, colorHex2: true, textColorHex: true, isActive: true, sortOrder: true },
    });

    revalidatePath("/admin/categories");
    return { updated };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "이미 사용 중인 slug입니다." };
    }
    if (msg.includes("Unique constraint") && msg.includes("name")) {
      return { error: "이미 사용 중인 name(영어)입니다." };
    }
    return { error: "수정 중 오류가 발생했습니다." };
  }
}

export async function deleteTag(id: string): Promise<{ error?: string }> {
  try {
    await prisma.tag.delete({ where: { id } });
    revalidatePath("/admin/categories");
    return {};
  } catch {
    return { error: "삭제 중 오류가 발생했습니다." };
  }
}

// ─── Slug 중복 체크 ───────────────────────────────────────────────────────────

export async function checkTopicSlug(
  slug: string,
  excludeId?: string
): Promise<{ exists: boolean }> {
  if (!slug.trim()) return { exists: false };
  const count = await prisma.topic.count({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  return { exists: count > 0 };
}

export async function checkTagSlug(
  slug: string,
  excludeId?: string
): Promise<{ exists: boolean }> {
  if (!slug.trim()) return { exists: false };
  const count = await prisma.tag.count({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  return { exists: count > 0 };
}

export type TagGroupConfigData = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  sortOrder: number;
};

export async function upsertTagGroupConfig(
  group: string,
  data: TagGroupConfigFormData
): Promise<{ error?: string; updated?: TagGroupConfigData }> {
  try {
    const updated = await prisma.tagGroupConfig.upsert({
      where: { group },
      update: { nameEn: data.nameEn, colorHex: data.colorHex, colorHex2: data.colorHex2, gradientDir: data.gradientDir, gradientStop: data.gradientStop, textColorHex: data.textColorHex },
      create: { group, nameEn: data.nameEn, colorHex: data.colorHex, colorHex2: data.colorHex2, gradientDir: data.gradientDir, gradientStop: data.gradientStop, textColorHex: data.textColorHex },
      select: { group: true, nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true, sortOrder: true },
    });
    revalidatePath("/admin/categories");
    return { updated };
  } catch {
    return { error: "저장 중 오류가 발생했습니다." };
  }
}

export async function reorderTagGroups(orderedGroups: string[]): Promise<void> {
  await prisma.$transaction(
    orderedGroups.map((group, index) =>
      prisma.tagGroupConfig.update({ where: { group }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/admin/categories");
}

export type TagGroupConfigCreated = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  sortOrder: number;
};

export async function createTagGroup(
  data: TagGroupConfigFormData
): Promise<{ error?: string; created?: TagGroupConfigCreated }> {
  const group = data.nameEn.trim().toUpperCase().replace(/\W+/g, "_");
  if (!group) return { error: "그룹 이름(영어)을 입력해주세요." };
  try {
    const existing = await prisma.tagGroupConfig.findUnique({ where: { group } });
    if (existing) return { error: `이미 존재하는 그룹 키입니다: ${group}` };
    const last = await prisma.tagGroupConfig.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const sortOrder = (last?.sortOrder ?? -1) + 1;
    const created = await prisma.tagGroupConfig.create({
      data: { group, nameEn: data.nameEn.trim(), colorHex: data.colorHex, colorHex2: data.colorHex2, gradientDir: data.gradientDir, gradientStop: data.gradientStop, textColorHex: data.textColorHex, sortOrder },
      select: { group: true, nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true, sortOrder: true },
    });
    revalidatePath("/admin/categories");
    return { created };
  } catch {
    return { error: "그룹 생성 중 오류가 발생했습니다." };
  }
}

export async function deleteTagGroup(group: string): Promise<{ error?: string }> {
  try {
    const tagCount = await prisma.tag.count({ where: { group } });
    if (tagCount > 0) {
      return { error: `해당 그룹에 태그가 ${tagCount}개 있어 삭제할 수 없습니다. 먼저 태그를 삭제해주세요.` };
    }
    await prisma.tagGroupConfig.delete({ where: { group } });
    revalidatePath("/admin/categories");
    return {};
  } catch {
    return { error: "그룹 삭제 중 오류가 발생했습니다." };
  }
}
