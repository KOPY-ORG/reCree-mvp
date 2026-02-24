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
