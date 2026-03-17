"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateMatchScore } from "@/lib/gemini";

// ─── previewMatchScore ───────────────────────────────────────────────────────

export async function previewMatchScore(
  referenceUrl: string,
  shotUrl: string
): Promise<{ score: number } | { error: string }> {
  try {
    const score = await calculateMatchScore(referenceUrl, shotUrl);
    return { score };
  } catch (e) {
    console.error(e);
    return { error: "점수 계산 실패" };
  }
}

// ─── createPlaceFromGoogleMaps ────────────────────────────────────────────────

export async function createPlaceFromGoogleMaps(data: {
  nameKo: string;
  nameEn: string;
  addressKo: string;
  addressEn: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
  googleMapsUrl: string;
  phone?: string;
}): Promise<{ id: string; nameKo: string; nameEn: string | null; addressEn: string | null; city: string | null; imageUrl: string | null } | { error: string }> {
  try {
    // 이미 등록된 장소면 그대로 반환
    const existing = await prisma.place.findUnique({
      where: { googlePlaceId: data.googlePlaceId },
      select: PLACE_SELECT,
    });
    if (existing) return existing;

    const place = await prisma.place.create({
      data: {
        nameKo: data.nameKo,
        nameEn: data.nameEn,
        addressKo: data.addressKo,
        addressEn: data.addressEn,
        latitude: data.lat,
        longitude: data.lng,
        googlePlaceId: data.googlePlaceId,
        googleMapsUrl: data.googleMapsUrl,
        phone: data.phone,
        source: "USER",
        isVerified: false,
      },
      select: PLACE_SELECT,
    });
    return normalizePlaces([place])[0];
  } catch (e) {
    console.error(e);
    return { error: "장소 등록에 실패했습니다." };
  }
}

// ─── searchPlaces ─────────────────────────────────────────────────────────────

const PLACE_SELECT = {
  id: true,
  nameKo: true,
  nameEn: true,
  addressEn: true,
  city: true,
  imageUrl: true,
  placeImages: {
    where: { isThumbnail: true },
    select: { url: true },
    take: 1,
  },
} as const;

type PlaceRow = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
  placeImages: { url: string }[];
};

function normalizePlaces(places: PlaceRow[]): { id: string; nameKo: string; nameEn: string | null; addressEn: string | null; city: string | null; imageUrl: string | null }[] {
  return places.map(({ placeImages, imageUrl, ...rest }) => ({
    ...rest,
    imageUrl: placeImages[0]?.url ?? imageUrl,
  }));
}

export async function getPopularPlaces() {
  try {
    const places = await prisma.place.findMany({
      where: { isVerified: true },
      orderBy: { createdAt: "desc" },
      select: PLACE_SELECT,
      take: 20,
    });
    return normalizePlaces(places);
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function searchPlaces(query: string) {
  try {
    const places = await prisma.place.findMany({
      where: {
        OR: [
          { nameKo: { contains: query, mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
        ],
      },
      select: PLACE_SELECT,
      take: 15,
    });
    return normalizePlaces(places);
  } catch (e) {
    console.error(e);
    return [];
  }
}

// ─── getPostsByPlace ──────────────────────────────────────────────────────────

export async function getPostsByPlace(placeId: string) {
  try {
    const rows = await prisma.postPlace.findMany({
      where: { placeId },
      include: {
        post: {
          select: {
            id: true,
            titleEn: true,
            titleKo: true,
            status: true,
            postImages: {
              where: { isThumbnail: true },
              select: { url: true },
              take: 1,
            },
            postTopics: { select: { topicId: true } },
            postTags: { select: { tagId: true } },
          },
        },
      },
    });
    return rows
      .filter((r) => r.post.status === "PUBLISHED")
      .map((r) => ({
        id: r.post.id,
        titleEn: r.post.titleEn,
        titleKo: r.post.titleKo,
        thumbnailUrl: r.post.postImages[0]?.url ?? null,
        topicIds: r.post.postTopics.map((t) => t.topicId),
        tagIds: r.post.postTags.map((t) => t.tagId),
      }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

// ─── createReCreeshot ────────────────────────────────────────────────────────

interface CreateReCreeshotData {
  imageUrl: string;
  referencePhotoUrl?: string;
  matchScore?: number;
  showBadge?: boolean;
  placeId?: string;
  linkedPostId?: string;
  locationName?: string;
  story?: string;
  tips?: string;
  topicIds?: string[];
  tagIds?: string[];
}

export async function createReCreeshot(
  data: CreateReCreeshotData
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  try {
    const shot = await prisma.reCreeshot.create({
      data: {
        userId: user.id,
        imageUrl: data.imageUrl,
        referencePhotoUrl: data.referencePhotoUrl ?? null,
        matchScore: data.matchScore ?? null,
        showBadge: data.showBadge ?? false,
        placeId: data.placeId ?? null,
        linkedPostId: data.linkedPostId ?? null,
        locationName: data.locationName ?? null,
        story: data.story ?? null,
        tips: data.tips ?? null,
        reCreeshotTopics: data.topicIds?.length
          ? {
              create: data.topicIds.map((topicId) => ({ topicId })),
            }
          : undefined,
        reCreeshotTags: data.tagIds?.length
          ? {
              create: data.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
    });

    revalidatePath("/explore");
    return { id: shot.id };
  } catch (e) {
    console.error(e);
    return { error: "생성 실패" };
  }
}

// ─── scoreReCreeshot ─────────────────────────────────────────────────────────

export async function scoreReCreeshot(
  id: string
): Promise<{ matchScore: number } | { error: string }> {
  try {
    const shot = await prisma.reCreeshot.findUnique({
      where: { id },
      select: { imageUrl: true, referencePhotoUrl: true, matchScore: true },
    });

    if (!shot) return { error: "not found" };
    if (!shot.referencePhotoUrl) return { error: "no reference" };
    if (shot.matchScore !== null) return { matchScore: shot.matchScore }; // 이미 스코어 있으면 재계산 안 함

    const matchScore = await calculateMatchScore(
      shot.referencePhotoUrl,
      shot.imageUrl
    );

    await prisma.reCreeshot.update({
      where: { id },
      data: { matchScore, showBadge: true },
    });

    revalidatePath(`/explore/hall/${id}`);
    revalidatePath("/explore");
    return { matchScore };
  } catch (e) {
    console.error(e);
    return { error: "스코어링 실패" };
  }
}

// ─── toggleReCreeshotLike ────────────────────────────────────────────────────

export async function toggleReCreeshotLike(
  reCreeshotId: string
): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { liked: false, error: "unauthenticated" };

  const userId = user.id;

  const existing = await prisma.reCreeshotLike.findUnique({
    where: { userId_reCreeshotId: { userId, reCreeshotId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.reCreeshotLike.delete({ where: { id: existing.id } }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath(`/explore/hall/${reCreeshotId}`);
    return { liked: false };
  } else {
    await prisma.$transaction([
      prisma.reCreeshotLike.create({
        data: { userId, reCreeshotId },
      }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    revalidatePath(`/explore/hall/${reCreeshotId}`);
    return { liked: true };
  }
}

// ─── toggleReCreeshotSave ────────────────────────────────────────────────────

export async function toggleReCreeshotSave(
  reCreeshotId: string
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { saved: false, error: "unauthenticated" };

  const userId = user.id;

  const existing = await prisma.save.findUnique({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType: "RECREESHOT",
        targetId: reCreeshotId,
      },
    },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.save.delete({ where: { id: existing.id } }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath("/saved");
    return { saved: false };
  } else {
    await prisma.$transaction([
      prisma.save.create({
        data: { userId, targetType: "RECREESHOT", targetId: reCreeshotId },
      }),
      prisma.reCreeshot.update({
        where: { id: reCreeshotId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);
    revalidatePath("/saved");
    return { saved: true };
  }
}
