"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addArea(
  nameKo: string,
  level: number,
  parentId?: string | null,
  nameEn?: string,
): Promise<{ error?: string }> {
  try {
    if (!nameKo.trim()) {
      return { error: "한글명을 입력해주세요." };
    }
    if (level === 1 && !parentId) {
      return { error: "구역은 상위 도시를 선택해야 합니다." };
    }
    const maxOrder = await prisma.area.aggregate({
      where: { level, parentId: parentId ?? null },
      _max: { sortOrder: true },
    });
    await prisma.area.create({
      data: {
        nameKo: nameKo.trim(),
        nameEn: nameEn?.trim() || null,
        level,
        parentId: parentId || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath("/admin/areas");
    return {};
  } catch {
    return { error: "지역을 추가하는 중 오류가 발생했습니다." };
  }
}

export async function updateArea(
  id: string,
  data: { nameKo?: string; nameEn?: string },
): Promise<{ error?: string }> {
  try {
    await prisma.area.update({
      where: { id },
      data: {
        ...(data.nameKo !== undefined && { nameKo: data.nameKo }),
        ...(data.nameEn !== undefined && { nameEn: data.nameEn || null }),
      },
    });
    revalidatePath("/admin/areas");
    return {};
  } catch {
    return { error: "지역을 수정하는 중 오류가 발생했습니다." };
  }
}

export async function deleteArea(id: string): Promise<{ error?: string }> {
  try {
    const childCount = await prisma.area.count({ where: { parentId: id } });
    if (childCount > 0) {
      return { error: "하위 구역이 있는 도시는 삭제할 수 없습니다. 먼저 구역을 삭제해주세요." };
    }
    await prisma.area.delete({ where: { id } });
    revalidatePath("/admin/areas");
    return {};
  } catch {
    return { error: "지역을 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function reorderArea(
  id: string,
  sortOrder: number,
): Promise<{ error?: string }> {
  try {
    await prisma.area.update({ where: { id }, data: { sortOrder } });
    revalidatePath("/admin/areas");
    return {};
  } catch {
    return { error: "순서를 변경하는 중 오류가 발생했습니다." };
  }
}
