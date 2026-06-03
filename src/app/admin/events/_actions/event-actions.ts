"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventCategory, EventEntryType, EventStatus } from "@prisma/client";

export type EventFormData = {
  placeId: string;
  eventCollection: string;
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
};

function toEventInput(data: EventFormData) {
  return {
    placeId: data.placeId,
    eventCollection: data.eventCollection.trim(),
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

export async function createEvent(data: EventFormData): Promise<{ error?: string; id?: string }> {
  if (!data.placeId) return { error: "장소를 선택해주세요." };
  if (!data.eventCollection.trim()) return { error: "이벤트 컬렉션을 입력해주세요." };
  if (!data.startDate || !data.endDate) return { error: "기간을 입력해주세요." };
  if (new Date(data.startDate) > new Date(data.endDate)) return { error: "종료일이 시작일보다 빠를 수 없습니다." };

  let newId: string;
  try {
    const event = await prisma.event.create({ data: toEventInput(data) });
    newId = event.id;
  } catch (e) {
    console.error("이벤트 생성 오류:", e);
    return { error: "이벤트를 생성하는 중 오류가 발생했습니다." };
  }
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(id: string, data: EventFormData): Promise<{ error?: string }> {
  if (!data.placeId) return { error: "장소를 선택해주세요." };
  if (!data.eventCollection.trim()) return { error: "이벤트 컬렉션을 입력해주세요." };
  if (!data.startDate || !data.endDate) return { error: "기간을 입력해주세요." };
  if (new Date(data.startDate) > new Date(data.endDate)) return { error: "종료일이 시작일보다 빠를 수 없습니다." };

  try {
    await prisma.event.update({ where: { id }, data: toEventInput(data) });
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
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      placeId: true,
      eventCollection: true,
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
  return event;
}
