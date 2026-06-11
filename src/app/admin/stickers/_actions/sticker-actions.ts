"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/admin/stickers");
}

export async function getAllStickers() {
  return prisma.sticker.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function createSticker(data: {
  name: string;
  imageUrl: string;
  mimeType: string;
}) {
  const agg = await prisma.sticker.aggregate({ _max: { sortOrder: true } });
  const sticker = await prisma.sticker.create({
    data: { ...data, sortOrder: (agg._max.sortOrder ?? 0) + 1 },
  });
  revalidate();
  return sticker;
}

export async function updateStickerOrder(ids: string[]) {
  await Promise.all(
    ids.map((id, i) =>
      prisma.sticker.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  revalidate();
}

export async function toggleStickerActive(id: string) {
  const s = await prisma.sticker.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!s) return;
  await prisma.sticker.update({ where: { id }, data: { isActive: !s.isActive } });
  revalidate();
}

export async function deleteSticker(id: string) {
  await prisma.sticker.delete({ where: { id } });
  revalidate();
}
