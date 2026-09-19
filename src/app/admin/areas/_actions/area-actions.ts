"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── seed 관리 구간 ───────────────────────────────────────────────────────────
// level 0(시도) · 1(시군구)는 seed-areas.ts 가 TourAPI 기준으로 통째로 관리한다.
// 여기서 이름을 고치거나 지우면 lDongRegnCd · lDongSignguCds 연결이 조용히 끊기고,
// discover 의 지역 칩과 관광 섹션이 그 지역째 사라진다. 화면에서 컨트롤을 숨겼지만
// 액션은 네트워크로 직접 부를 수 있으니 막는 자리는 여기다.
//
// 함수를 지우지 않는 이유는 level 2(동네)다. 그때 이 가드만 지나가면 그대로 쓴다.

const SEED_MANAGED_LEVELS = [0, 1];

const SEED_MANAGED_ERROR =
  "시도 · 시군구는 TourAPI 기준으로 자동 관리됩니다. 변경은 seed 스크립트(prisma/scripts/seed-areas.ts)로 해주세요.";

/**
 * 대상 Area 가 seed 관리 구간이면 에러 문구, 아니면 null.
 *
 * level 을 DB 에서 읽는다 — 클라이언트가 보낸 값을 믿으면 level 2 라고 적어 보내는 것만으로
 * 가드를 지나간다.
 */
async function seedManagedError(id: string): Promise<string | null> {
  const area = await prisma.area.findUnique({ where: { id }, select: { level: true } });
  if (!area) return "지역을 찾을 수 없습니다.";
  return SEED_MANAGED_LEVELS.includes(area.level) ? SEED_MANAGED_ERROR : null;
}

export async function addArea(
  nameKo: string,
  level: number,
  parentId?: string | null,
  nameEn?: string,
): Promise<{ error?: string }> {
  try {
    if (SEED_MANAGED_LEVELS.includes(level)) {
      return { error: SEED_MANAGED_ERROR };
    }
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
    const managed = await seedManagedError(id);
    if (managed) return { error: managed };

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
    const managed = await seedManagedError(id);
    if (managed) return { error: managed };

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
    const managed = await seedManagedError(id);
    if (managed) return { error: managed };

    await prisma.area.update({ where: { id }, data: { sortOrder } });
    revalidatePath("/admin/areas");
    return {};
  } catch {
    return { error: "순서를 변경하는 중 오류가 발생했습니다." };
  }
}
