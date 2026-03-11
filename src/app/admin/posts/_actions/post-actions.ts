"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PostStatus, SourceType } from "@prisma/client";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

export type SpotInsightData = {
  contextKo: string;
  contextEn: string;
  vibe: string[];
  mustTryKo: string;
  mustTryEn: string;
  tipKo: string;
  tipEn: string;
};

export type PostImageInput = {
  id?: string;
  imageType: "BANNER" | "ORIGINAL";
  imageSource: "UPLOAD" | "URL" | "AUTO";
  url: string;
  linkUrl?: string | null;
  isThumbnail: boolean;
  sortOrder: number;
  slotIndex?: number | null;
  isSlotCard?: boolean;
};

export type PostSourceInput = {
  url: string;
  sourceType: "PRIMARY" | "REFERENCE";
  platform: string;       // YOUTUBE | X | INSTAGRAM | PINTEREST | BLOG | ARTICLE | OTHER
  sourceNote: string;
  sourcePostDate: string;
  isOriginalLink: boolean;
};

export type PostFormData = {
  titleKo: string;
  titleEn: string;
  slug: string;
  bodyKo: string;
  bodyEn: string;
  status: PostStatus;
  memo: string;
  // 수집 정보
  collectedBy: string;
  collectedAt: string;
  // 이미지
  images: PostImageInput[];
  // 복수 출처
  sources: PostSourceInput[];
  topics: { topicId: string; isVisible: boolean; displayOrder: number }[];
  tags: { tagId: string; isVisible: boolean; displayOrder: number }[];
  // 복수 장소
  places: { placeId: string; spotInsight: SpotInsightData | null }[];
};

// ─── 슬러그 중복 체크 ──────────────────────────────────────────────────────────

export async function checkPostSlug(
  slug: string,
  excludeId?: string,
): Promise<{ available: boolean }> {
  const existing = await prisma.post.findFirst({
    where: {
      slug,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  return { available: !existing };
}

// ─── 장소 검색 ─────────────────────────────────────────────────────────────────

export async function searchPlaces(keyword: string) {
  if (!keyword.trim()) return [];
  return prisma.place.findMany({
    where: {
      OR: [
        { nameKo: { contains: keyword, mode: "insensitive" } },
        { nameEn: { contains: keyword, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      addressKo: true,
      addressEn: true,
      latitude: true,
      longitude: true,
      phone: true,
      imageUrl: true,
      rating: true,
      status: true,
      operatingHours: true,
      googleMapsUrl: true,
      naverMapsUrl: true,
      gettingThere: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

// ─── 장소 상세 조회 ──────────────────────────────────────────────────────────────

export async function getPlaceDetail(id: string) {
  return prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      addressKo: true,
      addressEn: true,
      latitude: true,
      longitude: true,
      phone: true,
      imageUrl: true,
      rating: true,
      operatingHours: true,
      googleMapsUrl: true,
      naverMapsUrl: true,
      status: true,
      gettingThere: true,
    },
  });
}

// ─── 포스트 생성 ────────────────────────────────────────────────────────────────

export async function createPost(
  data: PostFormData,
): Promise<{ error?: string; id?: string }> {
  try {
    const user = await getCurrentUser();

    const post = await prisma.post.create({
      data: {
        titleKo: data.titleKo,
        titleEn: data.titleEn,
        slug: data.slug,
        bodyKo: data.bodyKo || null,
        bodyEn: data.bodyEn || null,
        status: data.status,
        memo: data.memo || null,
        collectedBy: data.collectedBy || null,
        collectedAt: data.collectedAt || null,
        authorId: user?.id ?? null,
        postTopics: {
          create: data.topics.map((t) => ({
            topicId: t.topicId,
            isVisible: t.isVisible,
            displayOrder: t.displayOrder,
          })),
        },
        postTags: {
          create: data.tags.map((t) => ({
            tagId: t.tagId,
            isVisible: t.isVisible,
            displayOrder: t.displayOrder,
          })),
        },
        ...(data.images.length > 0 && {
          postImages: {
            create: data.images.map((img) => ({
              imageType: img.imageType,
              imageSource: img.imageSource,
              url: img.url,
              linkUrl: img.linkUrl ?? null,
              isThumbnail: img.isThumbnail,
              sortOrder: img.sortOrder,
              slotIndex: img.slotIndex ?? null,
              isSlotCard: img.isSlotCard ?? false,
            })),
          },
        }),
        ...(data.sources.length > 0 && {
          postSources: {
            create: data.sources.map((s, i) => ({
              url: s.url,
              sourceType: s.sourceType as SourceType,
              platform: s.platform || null,
              sourceNote: s.sourceNote || null,
              sourcePostDate: s.sourcePostDate || null,
              isOriginalLink: s.isOriginalLink,
              sortOrder: i,
            })),
          },
        }),
        ...(data.places.length > 0 && {
          postPlaces: {
            create: data.places.map((p) => ({
              placeId: p.placeId,
              context: p.spotInsight?.contextKo || null,
              vibe: p.spotInsight?.vibe ?? [],
              mustTry: p.spotInsight?.mustTryKo || null,
              tip: p.spotInsight?.tipKo || null,
              insightEn: p.spotInsight
                ? {
                    context: p.spotInsight.contextEn,
                    mustTry: p.spotInsight.mustTryEn,
                    tip: p.spotInsight.tipEn,
                  }
                : undefined,
            })),
          },
        }),
      },
    });

    revalidatePath("/admin/posts");
    return { id: post.id };
  } catch (e) {
    console.error(e);
    return { error: "포스트를 생성하는 중 오류가 발생했습니다." };
  }
}

// ─── 포스트 수정 ────────────────────────────────────────────────────────────────

export async function updatePost(
  id: string,
  data: PostFormData,
): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.postTopic.deleteMany({ where: { postId: id } });
      await tx.postTag.deleteMany({ where: { postId: id } });
      await tx.postPlace.deleteMany({ where: { postId: id } });
      await tx.postSource.deleteMany({ where: { postId: id } });
      await tx.postImage.deleteMany({ where: { postId: id } });

      await tx.post.update({
        where: { id },
        data: {
          titleKo: data.titleKo,
          titleEn: data.titleEn,
          slug: data.slug,
          bodyKo: data.bodyKo || null,
          bodyEn: data.bodyEn || null,
          status: data.status,
          memo: data.memo || null,
          collectedBy: data.collectedBy || null,
          collectedAt: data.collectedAt || null,
          postTopics: {
            create: data.topics.map((t) => ({
              topicId: t.topicId,
              isVisible: t.isVisible,
              displayOrder: t.displayOrder,
            })),
          },
          postTags: {
            create: data.tags.map((t) => ({
              tagId: t.tagId,
              isVisible: t.isVisible,
              displayOrder: t.displayOrder,
            })),
          },
          ...(data.images.length > 0 && {
            postImages: {
              create: data.images.map((img) => ({
                imageType: img.imageType,
                imageSource: img.imageSource,
                url: img.url,
                linkUrl: img.linkUrl ?? null,
                isThumbnail: img.isThumbnail,
                sortOrder: img.sortOrder,
                slotIndex: img.slotIndex ?? null,
                isSlotCard: img.isSlotCard ?? false,
              })),
            },
          }),
          ...(data.sources.length > 0 && {
            postSources: {
              create: data.sources.map((s, i) => ({
                url: s.url,
                sourceType: s.sourceType as SourceType,
                platform: s.platform || null,
                sourceNote: s.sourceNote || null,
                sourcePostDate: s.sourcePostDate || null,
                isOriginalLink: s.isOriginalLink,
                sortOrder: i,
              })),
            },
          }),
          ...(data.places.length > 0 && {
            postPlaces: {
              create: data.places.map((p) => ({
                placeId: p.placeId,
                context: p.spotInsight?.contextKo || null,
                vibe: p.spotInsight?.vibe ?? [],
                mustTry: p.spotInsight?.mustTryKo || null,
                tip: p.spotInsight?.tipKo || null,
                insightEn: p.spotInsight
                  ? {
                      context: p.spotInsight.contextEn,
                      mustTry: p.spotInsight.mustTryEn,
                      tip: p.spotInsight.tipEn,
                    }
                  : undefined,
              })),
            },
          }),
        },
      });
    });

    revalidatePath("/admin/posts");
    revalidatePath(`/admin/posts/${id}/edit`);
    return {};
  } catch (e) {
    console.error(e);
    return { error: "포스트를 수정하는 중 오류가 발생했습니다." };
  }
}

// ─── 포스트 삭제 ────────────────────────────────────────────────────────────────

export async function deletePost(id: string): Promise<{ error?: string }> {
  try {
    await prisma.post.delete({ where: { id } });
    revalidatePath("/admin/posts");
    return {};
  } catch (e) {
    console.error(e);
    return { error: "포스트를 삭제하는 중 오류가 발생했습니다." };
  }
}

// ─── 발행 / 발행취소 ────────────────────────────────────────────────────────────

export async function publishPost(
  id: string,
): Promise<{ error?: string; missing?: string[] }> {
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postTopics: { select: { isVisible: true } },
        postTags: { select: { isVisible: true } },
        postPlaces: true,
        postImages: { select: { isThumbnail: true } },
      },
    });

    if (!post) return { error: "포스트를 찾을 수 없습니다." };

    const missing: string[] = [];
    if (!post.titleKo?.trim()) missing.push("한국어 제목");
    if (!post.titleEn?.trim()) missing.push("영어 제목");
    if (post.postTopics.length === 0) missing.push("토픽 1개 이상");
    if (!post.postImages.some((img) => img.isThumbnail)) missing.push("썸네일 이미지");
    const visibleCount =
      post.postTopics.filter((t) => t.isVisible).length +
      post.postTags.filter((t) => t.isVisible).length;
    if (visibleCount < 1) missing.push("라벨 1개 이상 표시 설정 필요");

    if (missing.length > 0) return { missing };

    await prisma.post.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    revalidatePath("/admin/posts");
    return {};
  } catch (e) {
    console.error(e);
    return { error: "발행 중 오류가 발생했습니다." };
  }
}

export async function unpublishPost(id: string): Promise<{ error?: string }> {
  try {
    await prisma.post.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null },
    });
    revalidatePath("/admin/posts");
    return {};
  } catch (e) {
    console.error(e);
    return { error: "발행 취소 중 오류가 발생했습니다." };
  }
}

// ─── 포스트 편집 데이터 조회 (Sheet용) ──────────────────────────────────────────

export async function getPostEditData(id: string) {
  const [post, allTagsRaw, tagGroupConfigs, allTopics] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        postTopics: { select: { topicId: true, isVisible: true, displayOrder: true } },
        postTags: { select: { tagId: true, isVisible: true, displayOrder: true } },
        postPlaces: {
          select: {
            placeId: true,
            context: true,
            vibe: true,
            mustTry: true,
            tip: true,
            insightEn: true,
            place: {
              select: {
                nameKo: true,
                nameEn: true,
                addressKo: true,
                addressEn: true,
                latitude: true,
                longitude: true,
                phone: true,
                imageUrl: true,
                rating: true,
                status: true,
                operatingHours: true,
                googleMapsUrl: true,
                naverMapsUrl: true,
                gettingThere: true,
              },
            },
          },
        },
        postImages: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            imageType: true,
            imageSource: true,
            url: true,
            linkUrl: true,
            isThumbnail: true,
            sortOrder: true,
            slotIndex: true,
            isSlotCard: true,
          },
        },
        postSources: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            url: true,
            sourceType: true,
            platform: true,
            sourceNote: true,
            sourcePostDate: true,
            isOriginalLink: true,
            sortOrder: true,
          },
        },
      },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameKo: true,
        group: true,
        colorHex: true,
        colorHex2: true,
        textColorHex: true,
      },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.tagGroupConfig.findMany({
      select: {
        group: true,
        nameEn: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameKo: true,
        nameEn: true,
        level: true,
        parentId: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  if (!post) return null;

  const configMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));
  const allTags = allTagsRaw.map((tag) => ({
    ...tag,
    effectiveColorHex: tag.colorHex ?? configMap.get(tag.group)?.colorHex ?? "#C8FF09",
    effectiveColorHex2: tag.colorHex2 ?? configMap.get(tag.group)?.colorHex2 ?? null,
    effectiveGradientDir: configMap.get(tag.group)?.gradientDir ?? "to bottom",
    effectiveGradientStop: configMap.get(tag.group)?.gradientStop ?? 150,
    effectiveTextColorHex: tag.textColorHex ?? configMap.get(tag.group)?.textColorHex ?? "#000000",
  }));

  const tagGroups = tagGroupConfigs.map((c) => ({
    group: c.group,
    nameEn: c.nameEn,
  }));

  const firstPlace = post.postPlaces[0];

  const initialData = {
    id: post.id,
    titleKo: post.titleKo,
    titleEn: post.titleEn,
    slug: post.slug,
    bodyKo: post.bodyKo,
    bodyEn: post.bodyEn,
    status: post.status,
    memo: post.memo,
    collectedBy: post.collectedBy,
    collectedAt: post.collectedAt,
    postTopics: post.postTopics,
    postTags: post.postTags,
    postImages: post.postImages.map((img) => ({
      id: img.id,
      imageType: img.imageType as "BANNER" | "ORIGINAL",
      imageSource: img.imageSource as "UPLOAD" | "URL" | "AUTO",
      url: img.url,
      linkUrl: img.linkUrl ?? null,
      isThumbnail: img.isThumbnail,
      sortOrder: img.sortOrder,
      slotIndex: img.slotIndex ?? null,
      isSlotCard: img.isSlotCard,
    })),
    postSources: post.postSources.map((s) => ({
      url: s.url,
      sourceType: s.sourceType as "PRIMARY" | "REFERENCE",
      platform: s.platform ?? "",
      sourceNote: s.sourceNote ?? "",
      sourcePostDate: s.sourcePostDate ?? "",
      isOriginalLink: s.isOriginalLink,
    })),
    postPlaces: firstPlace
      ? [
          {
            placeId: firstPlace.placeId,
            placeNameKo: firstPlace.place.nameKo,
            placeNameEn: firstPlace.place.nameEn,
            placeAddressKo: firstPlace.place.addressKo,
            placeAddressEn: firstPlace.place.addressEn,
            placeLatitude: firstPlace.place.latitude,
            placeLongitude: firstPlace.place.longitude,
            placePhone: firstPlace.place.phone,
            placeImageUrl: firstPlace.place.imageUrl,
            placeRating: firstPlace.place.rating,
            placeStatus: firstPlace.place.status,
            placeOperatingHours: firstPlace.place.operatingHours,
            placeGoogleMapsUrl: firstPlace.place.googleMapsUrl,
            placeNaverMapsUrl: firstPlace.place.naverMapsUrl,
            placeGettingThere: firstPlace.place.gettingThere,
            context: firstPlace.context,
            vibe: firstPlace.vibe,
            mustTry: firstPlace.mustTry,
            tip: firstPlace.tip,
            insightEn: firstPlace.insightEn as {
              context?: string;
              mustTry?: string;
              tip?: string;
            } | null,
          },
        ]
      : [],
  };

  return { post, initialData, allTags, tagGroups, allTopics };
}
