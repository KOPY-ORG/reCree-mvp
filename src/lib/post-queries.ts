// 포스트 + 라벨 공통 Prisma 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getPostsWithLabels(
  where: Prisma.PostWhereInput,
  options?: {
    take?: number;
    orderBy?: Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[];
    cursor?: string;
  }
) {
  return prisma.post.findMany({
    where,
    take: options?.take,
    orderBy: options?.orderBy,
    ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      titleEn: true,
      subtitle: true,
      isShop: true,
      createdAt: true,
      postImages: {
        where: { isThumbnail: true },
        select: { url: true, focalX: true, focalY: true, zoom: true },
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
              slug: true,
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

/** shop 포스트 목록 — postTags는 isVisible 필터 없이 전체 로드 (카드 표시용/필터 매칭용 겸용) */
export async function getShopPosts() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", isShop: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      titleEn: true,
      subtitle: true,
      postImages: {
        where: { isThumbnail: true },
        select: { url: true, focalX: true, focalY: true, zoom: true },
        take: 1,
      },
      postTags: {
        orderBy: { displayOrder: "asc" },
        select: {
          isVisible: true,
          tag: {
            select: {
              id: true,
              name: true,
              group: true,
              colorHex: true,
              colorHex2: true,
              textColorHex: true,
            },
          },
        },
      },
    },
  });
}

export type ShopPostItem = Awaited<ReturnType<typeof getShopPosts>>[number];

export async function getSavedPostIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.save.findMany({
    where: { userId, targetType: "POST" },
    select: { targetId: true },
  });
  return new Set(rows.map((r) => r.targetId));
}

export async function getSavedEventIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.save.findMany({
    where: { userId, targetType: "EVENT" },
    select: { targetId: true },
  });
  return new Set(rows.map((r) => r.targetId));
}
