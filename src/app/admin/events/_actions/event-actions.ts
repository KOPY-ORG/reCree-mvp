"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventCategory, EventEntryType, EventStatus } from "@prisma/client";

export type TranslationField = {
  name: string;
  eventContent: string;
  contentDetail: string;
  description: string;
  hoursNote: string;
};

export type EventFormData = {
  placeId: string;
  eventCollectionId: string;
  category: EventCategory;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  openTime: string;    // "HH:MM" | ""
  closeTime: string;
  entryType: EventEntryType;
  reservationUrl: string;
  officialUrl: string;
  snsUrl: string;
  bannerImageUrl: string | null;
  status: EventStatus;
  showOnHome: boolean;
  sortOrder: number;
  translations: Record<string, TranslationField>;
};

function toEventInput(data: EventFormData) {
  return {
    placeId: data.placeId,
    eventCollectionId: data.eventCollectionId,
    category: data.category,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    openTime: data.openTime.trim() || null,
    closeTime: data.closeTime.trim() || null,
    entryType: data.entryType,
    reservationUrl: data.reservationUrl.trim() || null,
    officialUrl: data.officialUrl.trim() || null,
    snsUrl: data.snsUrl.trim() || null,
    bannerImageUrl: data.bannerImageUrl || null,
    status: data.status,
    showOnHome: data.showOnHome,
    sortOrder: data.sortOrder,
  };
}

function buildTranslationRows(
  eventId: string,
  translations: Record<string, TranslationField>,
) {
  return Object.entries(translations)
    .filter(([, t]) => t.name.trim() !== "")
    .map(([locale, t]) => ({
      eventId,
      locale,
      name: t.name.trim(),
      eventContent: t.eventContent.trim() || null,
      contentDetail: t.contentDetail.trim() || null,
      description: t.description.trim() || null,
      hoursNote: t.hoursNote.trim() || null,
    }));
}

export async function createEvent(
  data: EventFormData,
): Promise<{ error?: string }> {
  if (!data.placeId) return { error: "장소를 선택해주세요." };
  if (!data.eventCollectionId) return { error: "컬렉션을 선택해주세요." };
  if (!data.startDate || !data.endDate) return { error: "기간을 입력해주세요." };
  if (new Date(data.startDate) > new Date(data.endDate))
    return { error: "종료일이 시작일보다 빠를 수 없습니다." };
  if (!data.translations?.ko?.name?.trim())
    return { error: "한국어 이벤트명을 입력해주세요." };
  if (!data.translations?.en?.name?.trim())
    return { error: "영어 이벤트명을 입력해주세요." };

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({ data: toEventInput(data) });
      const rows = buildTranslationRows(event.id, data.translations);
      if (rows.length) {
        await tx.eventTranslation.createMany({ data: rows });
      }
    });
  } catch (e) {
    console.error("이벤트 생성 오류:", e);
    return { error: "이벤트를 생성하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(
  id: string,
  data: EventFormData,
): Promise<{ error?: string }> {
  if (!data.placeId) return { error: "장소를 선택해주세요." };
  if (!data.eventCollectionId) return { error: "컬렉션을 선택해주세요." };
  if (!data.startDate || !data.endDate) return { error: "기간을 입력해주세요." };
  if (new Date(data.startDate) > new Date(data.endDate))
    return { error: "종료일이 시작일보다 빠를 수 없습니다." };
  if (!data.translations?.ko?.name?.trim())
    return { error: "한국어 이벤트명을 입력해주세요." };
  if (!data.translations?.en?.name?.trim())
    return { error: "영어 이벤트명을 입력해주세요." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: toEventInput(data) });
      await tx.eventTranslation.deleteMany({ where: { eventId: id } });
      const rows = buildTranslationRows(id, data.translations);
      if (rows.length) {
        await tx.eventTranslation.createMany({ data: rows });
      }
    });
  } catch (e) {
    console.error("이벤트 수정 오류:", e);
    return { error: "이벤트를 수정하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath("/admin/events");
    return {};
  } catch (e) {
    console.error("이벤트 삭제 오류:", e);
    return { error: "이벤트를 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function getEventForEdit(id: string) {
  return await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      placeId: true,
      eventCollectionId: true,
      category: true,
      startDate: true,
      endDate: true,
      openTime: true,
      closeTime: true,
      entryType: true,
      reservationUrl: true,
      officialUrl: true,
      snsUrl: true,
      bannerImageUrl: true,
      status: true,
      showOnHome: true,
      sortOrder: true,
      translations: {
        select: {
          locale: true,
          name: true,
          eventContent: true,
          contentDetail: true,
          description: true,
          hoursNote: true,
        },
      },
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
          placeImages: {
            orderBy: { sortOrder: "asc" },
            select: { url: true, isThumbnail: true },
          },
        },
      },
    },
  });
}
