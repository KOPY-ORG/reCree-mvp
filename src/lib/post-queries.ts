// 포스트 + 라벨 공통 Prisma 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// PostBadges(홈 라벨 규칙: 대표 토픽1 + 태그1)가 요구하는 topic select 형태 — 여러 쿼리에서 재사용
const postTopicsSelect = {
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
} satisfies Prisma.Post$postTopicsArgs;

// shop 전용 topic select — 공유 postTopicsSelect + topic.level.
// shop 라벨 규칙(selectShopLabels)이 멤버(최상위 level) 우선 선택에 level을 쓴다.
// ★ 공유 postTopicsSelect는 건드리지 않는다(비-shop 소비처 payload 유지).
// 정렬은 공유본과 동일하게 displayOrder asc 유지 — 우선순위는 selector가 level로 판단.
const shopPostTopicsSelect = {
  where: { isVisible: true },
  orderBy: { displayOrder: "asc" },
  select: {
    displayOrder: true,
    topic: {
      select: {
        nameEn: true,
        slug: true,
        level: true,
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
} satisfies Prisma.Post$postTopicsArgs;

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
      postTopics: postTopicsSelect,
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

/**
 * shop 포스트 목록.
 * postTopics: 홈 라벨 규칙(PostBadges) 계산용 — isVisible 필터 적용.
 * postTags: isVisible 필터 없이 전체 로드 — 그룹/태그 필터 매칭용(ShopClient)과
 * 라벨 표시용(ShopCard, isVisible만 골라 PostBadges에 전달) 겸용.
 */
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
      postTopics: shopPostTopicsSelect,
      postTags: {
        orderBy: { displayOrder: "asc" },
        select: {
          displayOrder: true,
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

/**
 * shop 포스트 목록 + 라벨 (Saved shop 탭 전용).
 * getPostsWithLabels와 동일 shape(postPlaces·isShop 포함)이되 topic.level을 추가로 로드해
 * shop 라벨 규칙(멤버 우선)을 적용할 수 있게 한다.
 * ★ 비-shop 경로(getPostsWithLabels)는 건드리지 않으려 별도 함수로 분리.
 */
export async function getShopPostsWithLabels(
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
      postTopics: shopPostTopicsSelect,
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

export type ShopPostWithLabelsItem = Awaited<ReturnType<typeof getShopPostsWithLabels>>[number];

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
