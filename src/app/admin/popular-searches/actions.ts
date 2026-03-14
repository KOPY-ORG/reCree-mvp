"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addPopularSearch(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return { error: "키워드를 입력하세요." };

  const maxOrder = await prisma.popularSearch.aggregate({ _max: { order: true } });
  await prisma.popularSearch.create({
    data: { keyword: trimmed, order: (maxOrder._max.order ?? 0) + 1 },
  });
  revalidatePath("/admin/popular-searches");
}

export async function deletePopularSearch(id: string) {
  await prisma.popularSearch.delete({ where: { id } });
  revalidatePath("/admin/popular-searches");
}

export async function togglePopularSearch(id: string, isActive: boolean) {
  await prisma.popularSearch.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/popular-searches");
}

export async function updateOrder(id: string, order: number) {
  await prisma.popularSearch.update({ where: { id }, data: { order } });
  revalidatePath("/admin/popular-searches");
}
