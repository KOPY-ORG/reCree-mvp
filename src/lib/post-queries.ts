// 포스트 + 라벨 공통 Prisma 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getPostsWithLabels(
  where: Prisma.PostWhereInput,
  options?: { take?: number; orderBy?: Prisma.PostOrderByWithRelationInput }
) {
  return prisma.post.findMany({
    where,
    take: options?.take,
    orderBy: options?.orderBy,
    select: {
      id: true,
      slug: true,
      titleEn: true,
      postImages: {
        where: { isThumbnail: true },
        select: { url: true },
        take: 1,
      },
      postTopics: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        select: {
          displayOrder: true,
          topic: {
            select: {
              nameEn: true,
              colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
              parent: {
                select: {
                  colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                  parent: {
                    select: {
                      colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                      parent: { select: { colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      postTags: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        select: {
          displayOrder: true,
          tag: { select: { name: true, group: true, colorHex: true, colorHex2: true, textColorHex: true } },
        },
      },
      postPlaces: {
        take: 1,
        select: {
          place: { select: { nameEn: true, nameKo: true } },
        },
      },
    },
  });
}

export type PostItem = Awaited<ReturnType<typeof getPostsWithLabels>>[number];

export async function getSavedPostIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.save.findMany({
    where: { userId, targetType: "POST" },
    select: { targetId: true },
  });
  return new Set(rows.map((r) => r.targetId));
}
