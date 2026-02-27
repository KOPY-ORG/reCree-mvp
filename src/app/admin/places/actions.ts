"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { PlaceStatus } from "@prisma/client";

export type PlaceFormData = {
  nameKo: string;
  nameEn: string;
  addressKo: string;
  addressEn: string;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  kakaoMapsUrl: string | null;
  phone: string;
  operatingHours: string[] | null;
  status: PlaceStatus;
  isVerified: boolean;
};

export async function deletePlace(id: string): Promise<{ error?: string }> {
  try {
    const postCount = await prisma.postPlace.count({ where: { placeId: id } });
    if (postCount > 0) {
      return {
        error: `이 장소를 사용 중인 포스트가 ${postCount}개 있습니다. 먼저 연결을 해제해주세요.`,
      };
    }
    await prisma.place.delete({ where: { id } });
    revalidatePath("/admin/places");
    return {};
  } catch {
    return { error: "장소를 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function createPlace(
  data: PlaceFormData,
): Promise<{ error?: string; id?: string }> {
  try {
    const place = await prisma.place.create({
      data: {
        nameKo: data.nameKo,
        nameEn: data.nameEn || null,
        addressKo: data.addressKo || null,
        addressEn: data.addressEn || null,
        country: data.country,
        city: data.city || null,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId || null,
        googleMapsUrl: data.googleMapsUrl || null,
        naverMapsUrl: data.naverMapsUrl || null,
        kakaoMapsUrl: data.kakaoMapsUrl || null,
        phone: data.phone || null,
        operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
        status: data.status,
        isVerified: data.isVerified,
      },
    });
    revalidatePath("/admin/places");
    return { id: place.id };
  } catch {
    return { error: "장소를 생성하는 중 오류가 발생했습니다." };
  }
}

export async function updatePlace(
  id: string,
  data: PlaceFormData,
): Promise<{ error?: string }> {
  try {
    await prisma.place.update({
      where: { id },
      data: {
        nameKo: data.nameKo,
        nameEn: data.nameEn || null,
        addressKo: data.addressKo || null,
        addressEn: data.addressEn || null,
        country: data.country,
        city: data.city || null,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId || null,
        googleMapsUrl: data.googleMapsUrl || null,
        naverMapsUrl: data.naverMapsUrl || null,
        kakaoMapsUrl: data.kakaoMapsUrl || null,
        phone: data.phone || null,
        operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
        status: data.status,
        isVerified: data.isVerified,
      },
    });
    revalidatePath("/admin/places");
    return {};
  } catch {
    return { error: "장소를 수정하는 중 오류가 발생했습니다." };
  }
}
