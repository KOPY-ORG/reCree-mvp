"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addPlaceType(
  name: string,
  nameKo: string,
): Promise<{ error?: string }> {
  try {
    if (!name.trim() || !nameKo.trim()) {
      return { error: "영문 키와 한글명을 모두 입력해주세요." };
    }
    const maxOrder = await prisma.placeType.aggregate({ _max: { sortOrder: true } });
    await prisma.placeType.create({
      data: {
        name: name.trim(),
        nameKo: nameKo.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "장소 유형을 추가하는 중 오류가 발생했습니다. (키 중복 여부 확인)" };
  }
}

export async function updatePlaceType(
  id: string,
  data: { name?: string; nameKo?: string },
): Promise<{ error?: string }> {
  try {
    await prisma.placeType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nameKo !== undefined && { nameKo: data.nameKo }),
      },
    });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "장소 유형을 수정하는 중 오류가 발생했습니다." };
  }
}

export async function deletePlaceType(id: string): Promise<{ error?: string }> {
  try {
    await prisma.placeType.delete({ where: { id } });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "장소 유형을 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function togglePlaceType(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await prisma.placeType.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "장소 유형 상태를 변경하는 중 오류가 발생했습니다." };
  }
}

export async function reorderPlaceType(
  id: string,
  sortOrder: number,
): Promise<{ error?: string }> {
  try {
    await prisma.placeType.update({ where: { id }, data: { sortOrder } });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "순서를 변경하는 중 오류가 발생했습니다." };
  }
}
