"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { PlaceCategory } from "@prisma/client";
import { PLACE_CATEGORY_LABELS_KO } from "@/lib/place-types";

/**
 * 기본값은 카테고리당 하나다 — "식당" 처럼 "어느 종류인지 모른다" 는 자리는 한 카테고리에
 * 하나뿐이어야 한다. 둘이면 장소 저장 때 어느 쪽을 빼야 할지 정할 수 없다.
 */
async function findExistingDefault(category: PlaceCategory, exceptId?: string) {
  return prisma.placeType.findFirst({
    where: { category, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { nameKo: true },
  });
}

export async function addPlaceType(
  name: string,
  nameKo: string,
  category: PlaceCategory,
  isDefault: boolean,
): Promise<{ error?: string }> {
  try {
    if (!name.trim() || !nameKo.trim()) {
      return { error: "영문 이름과 한글명을 모두 입력해주세요." };
    }
    if (isDefault) {
      const existing = await findExistingDefault(category);
      if (existing) {
        return {
          error: `${PLACE_CATEGORY_LABELS_KO[category]} 카테고리에는 이미 기본값 "${existing.nameKo}" 이 있습니다. 기본값은 카테고리당 하나입니다.`,
        };
      }
    }
    // 새 타입은 그 카테고리의 맨 뒤에 붙는다. 전체 최대값(옛 타입 100번대)을 쓰면
    // 엉뚱하게 106 부터 시작해 카테고리 밖으로 밀려난다.
    const maxOrder = await prisma.placeType.aggregate({
      where: { category },
      _max: { sortOrder: true },
    });
    await prisma.placeType.create({
      data: {
        name: name.trim(),
        nameKo: nameKo.trim(),
        category,
        isDefault,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath("/admin/place-types");
    return {};
  } catch {
    return { error: "장소 유형을 추가하는 중 오류가 발생했습니다. (이름 중복 여부 확인)" };
  }
}

export async function updatePlaceType(
  id: string,
  data: { name?: string; nameKo?: string; category?: PlaceCategory; isDefault?: boolean },
): Promise<{ error?: string }> {
  try {
    const current = await prisma.placeType.findUnique({
      where: { id },
      select: { category: true, isDefault: true },
    });
    if (!current) return { error: "장소 유형을 찾을 수 없습니다." };

    const nextCategory = data.category ?? current.category;
    const nextIsDefault = data.isDefault ?? current.isDefault;
    if (nextIsDefault) {
      const existing = await findExistingDefault(nextCategory, id);
      if (existing) {
        return {
          error: `${PLACE_CATEGORY_LABELS_KO[nextCategory]} 카테고리에는 이미 기본값 "${existing.nameKo}" 이 있습니다. 기본값은 카테고리당 하나입니다.`,
        };
      }
    }

    // 카테고리를 옮기면 sortOrder 도 새 카테고리의 맨 뒤로 따라간다 —
    // 옛 카테고리 안의 번호를 들고 가면 목록에서 엉뚱한 자리에 앉는다
    let sortOrder: number | undefined;
    if (data.category !== undefined && data.category !== current.category) {
      const maxOrder = await prisma.placeType.aggregate({
        where: { category: data.category },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    await prisma.placeType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nameKo !== undefined && { nameKo: data.nameKo }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
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
    // 쓰는 장소가 있으면 지우지 않는다. FK 가 Restrict 라 어차피 막히는데,
    // 그때 나오는 건 정체를 알 수 없는 DB 오류라 여기서 먼저 세어 이유를 말한다
    const used = await prisma.placePlaceType.count({ where: { placeTypeId: id } });
    if (used > 0) {
      const type = await prisma.placeType.findUnique({ where: { id }, select: { nameKo: true } });
      return {
        error: `"${type?.nameKo ?? "이 유형"}" 을 사용 중인 장소가 ${used}곳 있습니다. 먼저 그 장소들의 유형을 바꿔주세요.`,
      };
    }
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
