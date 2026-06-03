"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventStatus } from "@prisma/client";

export type CollectionTranslationField = {
  name: string;
};

export type CollectionFormData = {
  slug: string;
  status: EventStatus;
  sortOrder: number;
  translations: Record<string, CollectionTranslationField>;
};

export type CollectionOption = {
  id: string;
  slug: string;
  nameKo: string;
};

function buildTranslationRows(
  collectionId: string,
  translations: Record<string, CollectionTranslationField>,
) {
  return Object.entries(translations)
    .filter(([, t]) => t.name.trim() !== "")
    .map(([locale, t]) => ({ collectionId, locale, name: t.name.trim() }));
}

export async function createCollection(
  data: CollectionFormData,
): Promise<{ error?: string }> {
  if (!data.slug.trim()) return { error: "슬러그를 입력해주세요." };
  if (!data.translations?.ko?.name?.trim())
    return { error: "한국어 컬렉션명을 입력해주세요." };
  if (!data.translations?.en?.name?.trim())
    return { error: "영어 컬렉션명을 입력해주세요." };

  try {
    await prisma.$transaction(async (tx) => {
      const collection = await tx.eventCollection.create({
        data: {
          slug: data.slug.trim().toUpperCase(),
          status: data.status,
          sortOrder: data.sortOrder,
        },
      });
      const rows = buildTranslationRows(collection.id, data.translations);
      if (rows.length) {
        await tx.eventCollectionTranslation.createMany({ data: rows });
      }
    });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    )
      return { error: "이미 존재하는 슬러그입니다." };
    console.error("컬렉션 생성 오류:", e);
    return { error: "컬렉션을 생성하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateCollection(
  id: string,
  data: CollectionFormData,
): Promise<{ error?: string }> {
  if (!data.slug.trim()) return { error: "슬러그를 입력해주세요." };
  if (!data.translations?.ko?.name?.trim())
    return { error: "한국어 컬렉션명을 입력해주세요." };
  if (!data.translations?.en?.name?.trim())
    return { error: "영어 컬렉션명을 입력해주세요." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.eventCollection.update({
        where: { id },
        data: {
          slug: data.slug.trim().toUpperCase(),
          status: data.status,
          sortOrder: data.sortOrder,
        },
      });
      await tx.eventCollectionTranslation.deleteMany({
        where: { collectionId: id },
      });
      const rows = buildTranslationRows(id, data.translations);
      if (rows.length) {
        await tx.eventCollectionTranslation.createMany({ data: rows });
      }
    });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    )
      return { error: "이미 존재하는 슬러그입니다." };
    console.error("컬렉션 수정 오류:", e);
    return { error: "컬렉션을 수정하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteCollection(
  id: string,
): Promise<{ error?: string }> {
  try {
    await prisma.eventCollection.delete({ where: { id } });
    revalidatePath("/admin/events");
    return {};
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2003"
    )
      return { error: "이벤트가 연결된 컬렉션은 삭제할 수 없습니다." };
    console.error("컬렉션 삭제 오류:", e);
    return { error: "컬렉션을 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function getCollectionForEdit(id: string) {
  return await prisma.eventCollection.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      sortOrder: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
  });
}

export async function getAllCollections(): Promise<CollectionOption[]> {
  const collections = await prisma.eventCollection.findMany({
    select: {
      id: true,
      slug: true,
      translations: {
        where: { locale: "ko" },
        select: { name: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return collections.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameKo: c.translations[0]?.name ?? c.slug,
  }));
}
