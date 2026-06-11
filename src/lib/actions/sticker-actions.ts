"use server";

import { prisma } from "@/lib/prisma";

export async function getActiveStickers() {
  return prisma.sticker.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, imageUrl: true, mimeType: true },
  });
}
