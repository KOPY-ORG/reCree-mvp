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
  areaId: string | null;
  placeTypes: string[];
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  kakaoMapsUrl: string | null;
  streetViewUrl: string | null;
  phone: string;
  operatingHours: string[] | null;
  gettingThere: string | null;
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
        areaId: data.areaId || null,
        placeTypes: data.placeTypes,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId || null,
        googleMapsUrl: data.googleMapsUrl || null,
        naverMapsUrl: data.naverMapsUrl || null,
        kakaoMapsUrl: data.kakaoMapsUrl || null,
        streetViewUrl: data.streetViewUrl || null,
        phone: data.phone || null,
        operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
        gettingThere: data.gettingThere || null,
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
        areaId: data.areaId || null,
        placeTypes: data.placeTypes,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId || null,
        googleMapsUrl: data.googleMapsUrl || null,
        naverMapsUrl: data.naverMapsUrl || null,
        kakaoMapsUrl: data.kakaoMapsUrl || null,
        streetViewUrl: data.streetViewUrl || null,
        phone: data.phone || null,
        operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
        gettingThere: data.gettingThere || null,
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

// ─── 구글 맵 좌표 링크 분석 ────────────────────────────────────────────────────

export async function resolveCoordinateLink(url: string): Promise<{
  lat: number;
  lng: number;
  googleMapsUrl: string;
} | { error: string }> {
  if (!url.trim()) return { error: "URL을 입력해주세요." };

  try {
    let workingUrl = url.trim();

    // 단축 URL 확장 (HEAD는 일부 서버에서 최종 URL 미반환 → GET 사용)
    if (workingUrl.includes("maps.app.goo.gl") || workingUrl.includes("goo.gl/maps")) {
      const res = await fetch(workingUrl, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; reCree/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      workingUrl = res.url;
    }

    // 스트릿뷰 URL 감지 (좌표 링크로 쓰면 안됨)
    if (workingUrl.includes("/@/data=") || /\/@-?\d+\.\d+,-?\d+\.\d+,[\d.]+a[,/]/.test(workingUrl)) {
      return { error: "스트릿뷰 URL은 좌표 링크로 사용할 수 없습니다. Street View URL 필드를 사용해주세요." };
    }

    // !3d lat !4d lng 패턴 (data 파라미터)
    const dataMatch = workingUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      return { lat, lng, googleMapsUrl: `https://www.google.com/maps/@${lat},${lng},17z` };
    }

    // @lat,lng 패턴
    const atMatch = workingUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      return { lat, lng, googleMapsUrl: `https://www.google.com/maps/@${lat},${lng},17z` };
    }

    // 공식 장소 URL: 좌표가 있으면 추출, 없으면 안내
    const placeMatch = workingUrl.match(/\/place\/([^/?]+)/);
    if (placeMatch?.[1]) {
      return { error: "공식 등록 장소 URL입니다. '구글 장소 검색' 버튼을 사용해주세요." };
    }

    return { error: "좌표를 추출할 수 없습니다. 구글 맵에서 '지도 위 우클릭 → 이 곳에 대한 정보' 후 좌표 URL을 복사해주세요." };
  } catch {
    return { error: "URL 분석 중 오류가 발생했습니다." };
  }
}

// ─── PlaceImage 액션 (edit 페이지 전용) ────────────────────────────────────────

export async function addPlaceImage(
  placeId: string,
  data: { url: string; caption?: string },
): Promise<{ error?: string; id?: string }> {
  try {
    if (!data.url.trim()) return { error: "이미지 URL을 입력해주세요." };
    const maxOrder = await prisma.placeImage.aggregate({
      where: { placeId },
      _max: { sortOrder: true },
    });
    const isFirst = (maxOrder._max.sortOrder === null);
    const img = await prisma.placeImage.create({
      data: {
        placeId,
        url: data.url.trim(),
        caption: data.caption?.trim() || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isThumbnail: isFirst,
      },
    });
    revalidatePath(`/admin/places/${placeId}/edit`);
    return { id: img.id };
  } catch {
    return { error: "이미지를 추가하는 중 오류가 발생했습니다." };
  }
}

export async function deletePlaceImage(
  imageId: string,
  placeId: string,
): Promise<{ error?: string }> {
  try {
    const img = await prisma.placeImage.findUnique({ where: { id: imageId } });
    await prisma.placeImage.delete({ where: { id: imageId } });
    // 삭제된 것이 썸네일이었다면 첫 번째 남은 이미지를 썸네일로 지정
    if (img?.isThumbnail) {
      const first = await prisma.placeImage.findFirst({
        where: { placeId },
        orderBy: { sortOrder: "asc" },
      });
      if (first) {
        await prisma.placeImage.update({ where: { id: first.id }, data: { isThumbnail: true } });
      }
    }
    revalidatePath(`/admin/places/${placeId}/edit`);
    return {};
  } catch {
    return { error: "이미지를 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function setPlaceImageThumbnail(
  placeId: string,
  imageId: string,
): Promise<{ error?: string }> {
  try {
    await prisma.$transaction([
      prisma.placeImage.updateMany({ where: { placeId }, data: { isThumbnail: false } }),
      prisma.placeImage.update({ where: { id: imageId }, data: { isThumbnail: true } }),
    ]);
    revalidatePath(`/admin/places/${placeId}/edit`);
    return {};
  } catch {
    return { error: "썸네일을 변경하는 중 오류가 발생했습니다." };
  }
}

export async function updatePlaceImageCaption(
  imageId: string,
  placeId: string,
  caption: string,
): Promise<{ error?: string }> {
  try {
    await prisma.placeImage.update({
      where: { id: imageId },
      data: { caption: caption.trim() || null },
    });
    revalidatePath(`/admin/places/${placeId}/edit`);
    return {};
  } catch {
    return { error: "캡션을 수정하는 중 오류가 발생했습니다." };
  }
}
