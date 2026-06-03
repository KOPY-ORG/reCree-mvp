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

export type PerkTranslationData = {
  badge: string;
  title: string;
  detail: string;
};

export type PerkData = {
  imageUrl: string | null;
  perkUrl: string;
  sortOrder: number;
  translations: Record<string, PerkTranslationData>;
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
  perks: PerkData[];
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

function buildPerkTranslationRows(
  perkId: string,
  translations: Record<string, PerkTranslationData>,
) {
  return Object.entries(translations)
    .filter(([, t]) => t.title.trim() !== "")
    .map(([locale, t]) => ({
      perkId,
      locale,
      badge: t.badge.trim() || null,
      title: t.title.trim(),
      detail: t.detail.trim() || null,
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
  for (let i = 0; i < data.perks.length; i++) {
    if (!data.perks[i].translations.ko?.title?.trim())
      return { error: `혜택 ${i + 1}번의 한국어 제목을 입력해주세요.` };
    if (!data.perks[i].translations.en?.title?.trim())
      return { error: `혜택 ${i + 1}번의 영어 제목을 입력해주세요.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({ data: toEventInput(data) });
      const rows = buildTranslationRows(event.id, data.translations);
      if (rows.length) {
        await tx.eventTranslation.createMany({ data: rows });
      }
      for (const p of data.perks) {
        const perk = await tx.eventPerk.create({
          data: {
            eventId: event.id,
            imageUrl: p.imageUrl || null,
            perkUrl: p.perkUrl.trim() || null,
            sortOrder: p.sortOrder,
          },
        });
        const prows = buildPerkTranslationRows(perk.id, p.translations);
        if (prows.length) {
          await tx.eventPerkTranslation.createMany({ data: prows });
        }
      }
    });
  } catch (e) {
    console.error("이벤트 생성 오류:", e);
    return { error: "이벤트를 생성하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${data.eventCollectionId}`);
  redirect(`/admin/events/${data.eventCollectionId}`);
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
  for (let i = 0; i < data.perks.length; i++) {
    if (!data.perks[i].translations.ko?.title?.trim())
      return { error: `혜택 ${i + 1}번의 한국어 제목을 입력해주세요.` };
    if (!data.perks[i].translations.en?.title?.trim())
      return { error: `혜택 ${i + 1}번의 영어 제목을 입력해주세요.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: toEventInput(data) });
      await tx.eventTranslation.deleteMany({ where: { eventId: id } });
      // 혜택 replace: 자식(translation) 먼저 삭제 후 perk 삭제 (FK 순서)
      await tx.eventPerkTranslation.deleteMany({ where: { perk: { eventId: id } } });
      await tx.eventPerk.deleteMany({ where: { eventId: id } });
      const rows = buildTranslationRows(id, data.translations);
      if (rows.length) {
        await tx.eventTranslation.createMany({ data: rows });
      }
      for (const p of data.perks) {
        const perk = await tx.eventPerk.create({
          data: {
            eventId: id,
            imageUrl: p.imageUrl || null,
            perkUrl: p.perkUrl.trim() || null,
            sortOrder: p.sortOrder,
          },
        });
        const prows = buildPerkTranslationRows(perk.id, p.translations);
        if (prows.length) {
          await tx.eventPerkTranslation.createMany({ data: prows });
        }
      }
    });
  } catch (e) {
    console.error("이벤트 수정 오류:", e);
    return { error: "이벤트를 수정하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${data.eventCollectionId}`);
  redirect(`/admin/events/${data.eventCollectionId}`);
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: { eventCollectionId: true },
    });
    await prisma.event.delete({ where: { id } });
    revalidatePath("/admin/events");
    if (event?.eventCollectionId) {
      revalidatePath(`/admin/events/${event.eventCollectionId}`);
    }
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
      perks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          perkUrl: true,
          sortOrder: true,
          translations: {
            select: { locale: true, badge: true, title: true, detail: true },
          },
        },
      },
    },
  });
}
