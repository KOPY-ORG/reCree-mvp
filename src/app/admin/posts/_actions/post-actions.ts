"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PostStatus } from "@prisma/client";

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

export type PostSourceInput = {
  sourceType: string;  // INSTAGRAM|YOUTUBE|TIKTOK|X|REDDIT|BLOG|NEWS|OTHER|""
  sourceUrl: string;
  sourceNote: string;
  sourcePostDate: string;
  referenceUrl: string;
};

export type PostFormData = {
  titleKo: string;
  titleEn: string;
  slug: string;
  subtitleKo: string;
  subtitleEn: string;
  bodyKo: string;
  bodyEn: string;
  thumbnailUrl: string;
  status: PostStatus;
  memo: string;
  // 수집 정보
  collectedBy: string;
  collectedAt: string;
  // 복수 출처
  sources: PostSourceInput[];
  topicIds: string[];
  tagIds: string[];
  placeId: string | null;
  spotInsight: SpotInsightData | null;
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
      status: true,
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
        subtitleKo: data.subtitleKo || null,
        subtitleEn: data.subtitleEn || null,
        bodyKo: data.bodyKo || null,
        bodyEn: data.bodyEn || null,
        thumbnailUrl: data.thumbnailUrl || null,
        status: data.status,
        memo: data.memo || null,
        collectedBy: data.collectedBy || null,
        collectedAt: data.collectedAt || null,
        authorId: user?.id ?? null,
        postTopics: {
          create: data.topicIds.map((topicId) => ({ topicId })),
        },
        postTags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
        ...(data.sources.length > 0 && {
          postSources: {
            create: data.sources.map((s, i) => ({
              sourceType: s.sourceType || null,
              sourceUrl: s.sourceUrl || null,
              sourceNote: s.sourceNote || null,
              sourcePostDate: s.sourcePostDate || null,
              referenceUrl: s.referenceUrl || null,
              sortOrder: i,
            })),
          },
        }),
        ...(data.placeId && {
          postPlaces: {
            create: [
              {
                placeId: data.placeId,
                context: data.spotInsight?.contextKo || null,
                vibe: data.spotInsight?.vibe ?? [],
                mustTry: data.spotInsight?.mustTryKo || null,
                tip: data.spotInsight?.tipKo || null,

                insightEn: data.spotInsight
                  ? {
                      context: data.spotInsight.contextEn,
                      mustTry: data.spotInsight.mustTryEn,
                      tip: data.spotInsight.tipEn,
                    }
                  : undefined,
              },
            ],
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

      await tx.post.update({
        where: { id },
        data: {
          titleKo: data.titleKo,
          titleEn: data.titleEn,
          slug: data.slug,
          subtitleKo: data.subtitleKo || null,
          subtitleEn: data.subtitleEn || null,
          bodyKo: data.bodyKo || null,
          bodyEn: data.bodyEn || null,
          thumbnailUrl: data.thumbnailUrl || null,
          status: data.status,
          memo: data.memo || null,
          collectedBy: data.collectedBy || null,
          collectedAt: data.collectedAt || null,
          postTopics: {
            create: data.topicIds.map((topicId) => ({ topicId })),
          },
          postTags: {
            create: data.tagIds.map((tagId) => ({ tagId })),
          },
          ...(data.sources.length > 0 && {
            postSources: {
              create: data.sources.map((s, i) => ({
                sourceType: s.sourceType || null,
                sourceUrl: s.sourceUrl || null,
                sourceNote: s.sourceNote || null,
                sourcePostDate: s.sourcePostDate || null,
                referenceUrl: s.referenceUrl || null,
                sortOrder: i,
              })),
            },
          }),
          ...(data.placeId && {
            postPlaces: {
              create: [
                {
                  placeId: data.placeId,
                  context: data.spotInsight?.contextKo || null,
                  vibe: data.spotInsight?.vibe ?? [],
                  mustTry: data.spotInsight?.mustTryKo || null,
                  tip: data.spotInsight?.tipKo || null,
  
                  insightEn: data.spotInsight
                    ? {
                        context: data.spotInsight.contextEn,
                        mustTry: data.spotInsight.mustTryEn,
                        tip: data.spotInsight.tipEn,
                      }
                    : undefined,
                },
              ],
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
        postTopics: true,
        postPlaces: true,
      },
    });

    if (!post) return { error: "포스트를 찾을 수 없습니다." };

    const missing: string[] = [];
    if (!post.titleKo?.trim()) missing.push("한국어 제목");
    if (!post.titleEn?.trim()) missing.push("영어 제목");
    if (post.postTopics.length === 0) missing.push("토픽 1개 이상");
    if (!post.thumbnailUrl) missing.push("썸네일 이미지");

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
