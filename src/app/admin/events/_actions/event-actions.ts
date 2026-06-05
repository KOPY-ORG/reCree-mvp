"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventBlockType, EventCategory, EventEntryType, EventStatus } from "@prisma/client";

export type TranslationField = {
  name: string;
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

export type BodyBlockTranslationData = {
  text: string;
};

export type BodyBlockData = {
  type: EventBlockType;
  imageUrl: string | null;
  sortOrder: number;
  translations: Record<string, BodyBlockTranslationData>;
};

export type EventFormData = {
  slug: string;
  places: { placeId: string; sortOrder: number }[];
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
  bodyBlocks: BodyBlockData[];
};

export async function checkEventSlug(
  slug: string,
  excludeId?: string,
): Promise<{ available: boolean }> {
  const existing = await prisma.event.findFirst({
    where: {
      slug,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  return { available: !existing };
}

function toEventInput(data: EventFormData) {
  return {
    slug: data.slug.trim(),
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
      description: t.description.trim() || null,
      hoursNote: t.hoursNote.trim() || null,
    }));
}

function buildBodyBlockTranslationRows(
  blockId: string,
  translations: Record<string, BodyBlockTranslationData>,
) {
  return Object.entries(translations)
    .filter(([, t]) => t.text.trim() !== "")
    .map(([locale, t]) => ({
      blockId,
      locale,
      text: t.text.trim(),
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
  const user = await getCurrentUser();
  if (!user || user.role === "USER") return { error: "권한이 없습니다." };
  if (!data.slug.trim()) return { error: "슬러그를 입력해주세요." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim()))
    return { error: "슬러그는 소문자·숫자·하이픈(-)만 사용할 수 있습니다." };
  if (!data.places || data.places.length === 0) return { error: "장소를 1개 이상 선택해주세요." };
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
  for (let i = 0; i < data.bodyBlocks.length; i++) {
    const b = data.bodyBlocks[i];
    if (b.type === "TEXT") {
      if (!b.translations.ko?.text?.trim())
        return { error: `본문 ${i + 1}번 블록의 한국어 내용을 입력해주세요.` };
      if (!b.translations.en?.text?.trim())
        return { error: `본문 ${i + 1}번 블록의 영어 내용을 입력해주세요.` };
    } else if (b.type === "IMAGE") {
      if (!b.imageUrl)
        return { error: `본문 ${i + 1}번 이미지를 업로드해주세요.` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({ data: toEventInput(data) });
      await tx.eventPlace.createMany({
        data: data.places.map((p) => ({
          eventId: event.id,
          placeId: p.placeId,
          sortOrder: p.sortOrder,
        })),
      });
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
      for (const b of data.bodyBlocks) {
        const block = await tx.eventBodyBlock.create({
          data: {
            eventId: event.id,
            type: b.type,
            imageUrl: b.type === "IMAGE" ? (b.imageUrl || null) : null,
            sortOrder: b.sortOrder,
          },
        });
        if (b.type === "TEXT") {
          const brows = buildBodyBlockTranslationRows(block.id, b.translations);
          if (brows.length) {
            await tx.eventBodyBlockTranslation.createMany({ data: brows });
          }
        }
      }
    });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    )
      return { error: "이미 사용 중인 슬러그입니다." };
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
  const user = await getCurrentUser();
  if (!user || user.role === "USER") return { error: "권한이 없습니다." };
  if (!data.slug.trim()) return { error: "슬러그를 입력해주세요." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim()))
    return { error: "슬러그는 소문자·숫자·하이픈(-)만 사용할 수 있습니다." };
  if (!data.places || data.places.length === 0) return { error: "장소를 1개 이상 선택해주세요." };
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
  for (let i = 0; i < data.bodyBlocks.length; i++) {
    const b = data.bodyBlocks[i];
    if (b.type === "TEXT") {
      if (!b.translations.ko?.text?.trim())
        return { error: `본문 ${i + 1}번 블록의 한국어 내용을 입력해주세요.` };
      if (!b.translations.en?.text?.trim())
        return { error: `본문 ${i + 1}번 블록의 영어 내용을 입력해주세요.` };
    } else if (b.type === "IMAGE") {
      if (!b.imageUrl)
        return { error: `본문 ${i + 1}번 이미지를 업로드해주세요.` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.eventPlace.deleteMany({ where: { eventId: id } });
      await tx.event.update({ where: { id }, data: toEventInput(data) });
      await tx.eventPlace.createMany({
        data: data.places.map((p) => ({
          eventId: id,
          placeId: p.placeId,
          sortOrder: p.sortOrder,
        })),
      });
      await tx.eventTranslation.deleteMany({ where: { eventId: id } });
      // 혜택 replace: 자식(translation) 먼저 삭제 후 perk 삭제 (FK 순서)
      await tx.eventPerkTranslation.deleteMany({ where: { perk: { eventId: id } } });
      await tx.eventPerk.deleteMany({ where: { eventId: id } });
      // 본문 블록 replace: 자식(translation) 먼저 삭제 후 block 삭제
      await tx.eventBodyBlockTranslation.deleteMany({ where: { block: { eventId: id } } });
      await tx.eventBodyBlock.deleteMany({ where: { eventId: id } });
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
      for (const b of data.bodyBlocks) {
        const block = await tx.eventBodyBlock.create({
          data: {
            eventId: id,
            type: b.type,
            imageUrl: b.type === "IMAGE" ? (b.imageUrl || null) : null,
            sortOrder: b.sortOrder,
          },
        });
        if (b.type === "TEXT") {
          const brows = buildBodyBlockTranslationRows(block.id, b.translations);
          if (brows.length) {
            await tx.eventBodyBlockTranslation.createMany({ data: brows });
          }
        }
      }
    });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    )
      return { error: "이미 사용 중인 슬러그입니다." };
    console.error("이벤트 수정 오류:", e);
    return { error: "이벤트를 수정하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${data.eventCollectionId}`);
  redirect(`/admin/events/${data.eventCollectionId}`);
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role === "USER") return { error: "권한이 없습니다." };
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
      slug: true,
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
          description: true,
          hoursNote: true,
        },
      },
      places: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          place: {
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
              placeImages: {
                orderBy: { sortOrder: "asc" },
                select: { url: true, isThumbnail: true },
              },
            },
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
      bodyBlocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          type: true,
          imageUrl: true,
          sortOrder: true,
          translations: {
            select: { locale: true, text: true },
          },
        },
      },
    },
  });
}
