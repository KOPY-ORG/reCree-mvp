"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { PlaceStatus } from "@prisma/client";
import { resolveGoogleMapsUrl, toOfficialStreetViewUrl, buildMapsUrlByCoords } from "@/lib/google-maps-url";
import { makeStorageExtractor, deleteStorageFiles } from "@/lib/storage";

const extractStoragePath = makeStorageExtractor("place-images");

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
  amapUrl: string | null;
  streetViewUrl: string | null;
  phone: string;
  operatingHours: string[] | null;
  gettingThere: string | null;
  status: PlaceStatus;
  isVerified: boolean;
};

/**
 * 폼이 준 이름 배열을 PlaceType 행으로 바꾼다. 배열 순서가 곧 sortOrder 이고 0 번이 대표다.
 *
 * id 가 아니라 이름으로 찾는 이유는 Place.placeTypes 가 이름 문자열 배열이기 때문이다 —
 * 두 저장소가 같은 값을 같은 순서로 들고 있어야 옛 코드와 새 코드가 어긋나지 않는다.
 */
async function resolvePlaceTypes(
  names: string[],
): Promise<{ error: string } | { types: { id: string; name: string }[] }> {
  if (names.length === 0) return { error: "장소 유형을 1개 이상 선택해주세요." };

  const duplicated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (duplicated.length > 0) {
    return { error: `장소 유형이 중복됐습니다: ${duplicated.join(", ")}` };
  }

  const rows = await prisma.placeType.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, nameKo: true, category: true, isDefault: true, isActive: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r]));

  const unknown = names.filter((n) => !byName.has(n));
  if (unknown.length > 0) {
    return { error: `장소 유형 마스터에 없는 이름입니다: ${unknown.join(", ")}` };
  }

  const selected = names.map((n) => byName.get(n)!);

  const inactive = selected.filter((t) => !t.isActive);
  if (inactive.length > 0) {
    return { error: `비활성 장소 유형은 쓸 수 없습니다: ${inactive.map((t) => t.nameKo).join(", ")}` };
  }

  // 같은 카테고리에 기본값과 구체 타입이 같이 오면 거부한다.
  // "식당"은 "한식"을 모르는 상태를 뜻하므로, 둘을 함께 붙이면 서로를 부정한다.
  for (const base of selected.filter((t) => t.isDefault)) {
    const specific = selected.filter((t) => t.category === base.category && !t.isDefault);
    if (specific.length > 0) {
      return {
        error: `같은 카테고리에서 기본값과 구체 타입을 함께 고를 수 없습니다: ${base.nameKo} + ${specific
          .map((t) => t.nameKo)
          .join(", ")}`,
      };
    }
  }

  return { types: selected.map((t) => ({ id: t.id, name: t.name })) };
}

export async function deletePlace(id: string): Promise<{ error?: string }> {
  try {
    const postCount = await prisma.postPlace.count({ where: { placeId: id } });
    if (postCount > 0) {
      return {
        error: `이 장소를 사용 중인 포스트가 ${postCount}개 있습니다. 먼저 연결을 해제해주세요.`,
      };
    }
    // Storage 파일 삭제 (best-effort)
    const images = await prisma.placeImage.findMany({
      where: { placeId: id },
      select: { url: true },
    });
    const storagePaths = images
      .map((img) => extractStoragePath(img.url))
      .filter((p): p is string => p !== null);
    await deleteStorageFiles("place-images", storagePaths);
    await prisma.place.delete({ where: { id } });
    revalidatePath("/admin/places");
    return {};
  } catch (e) {
    console.error("장소 삭제 오류:", e);
    return { error: "장소를 삭제하는 중 오류가 발생했습니다." };
  }
}

export async function createPlace(
  data: PlaceFormData,
  returnUrl?: string,
): Promise<{ error?: string; id?: string }> {
  const resolved = await resolvePlaceTypes(data.placeTypes);
  if ("error" in resolved) return { error: resolved.error };

  let newId: string | undefined;
  try {
    const streetViewUrl = data.streetViewUrl
      ? await toOfficialStreetViewUrl(data.streetViewUrl)
      : null;
    // 이름 배열과 연결 행을 한 트랜잭션에서 쓴다 — 둘이 갈라지면 지도 카테고리가 장소를 놓친다
    const place = await prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          nameKo: data.nameKo,
          nameEn: data.nameEn || null,
          addressKo: data.addressKo || null,
          addressEn: data.addressEn || null,
          areaId: data.areaId || null,
          placeTypes: resolved.types.map((t) => t.name),
          latitude: data.latitude,
          longitude: data.longitude,
          googlePlaceId: data.googlePlaceId || null,
          googleMapsUrl: data.googleMapsUrl || null,
          naverMapsUrl: data.naverMapsUrl || null,
          kakaoMapsUrl: data.kakaoMapsUrl || null,
          amapUrl: data.amapUrl || null,
          streetViewUrl,
          phone: data.phone || null,
          operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
          gettingThere: data.gettingThere || null,
          status: data.status,
          isVerified: data.isVerified,
        },
      });
      await tx.placePlaceType.createMany({
        data: resolved.types.map((t, i) => ({
          placeId: created.id,
          placeTypeId: t.id,
          sortOrder: i,
        })),
      });
      return created;
    });
    newId = place.id;
  } catch (e) {
    console.error("장소 생성 오류:", e);
    return { error: "장소를 생성하는 중 오류가 발생했습니다." };
  }
  if (returnUrl) redirect(returnUrl);
  return { id: newId };
}

export async function updatePlace(
  id: string,
  data: PlaceFormData,
  returnUrl?: string,
): Promise<{ error?: string }> {
  const resolved = await resolvePlaceTypes(data.placeTypes);
  if ("error" in resolved) return { error: resolved.error };

  try {
    const streetViewUrl = data.streetViewUrl
      ? await toOfficialStreetViewUrl(data.streetViewUrl)
      : null;
    // 연결 행은 지우고 다시 깐다 — 순서가 바뀐 경우까지 한 규칙으로 덮는다
    await prisma.$transaction(async (tx) => {
      await tx.place.update({
        where: { id },
        data: {
          nameKo: data.nameKo,
          nameEn: data.nameEn || null,
          addressKo: data.addressKo || null,
          addressEn: data.addressEn || null,
          areaId: data.areaId || null,
          placeTypes: resolved.types.map((t) => t.name),
          latitude: data.latitude,
          longitude: data.longitude,
          googlePlaceId: data.googlePlaceId || null,
          googleMapsUrl: data.googleMapsUrl || null,
          naverMapsUrl: data.naverMapsUrl || null,
          kakaoMapsUrl: data.kakaoMapsUrl || null,
          amapUrl: data.amapUrl || null,
          streetViewUrl,
          phone: data.phone || null,
          operatingHours: data.operatingHours?.length ? data.operatingHours : Prisma.DbNull,
          gettingThere: data.gettingThere || null,
          status: data.status,
          isVerified: data.isVerified,
        },
      });
      await tx.placePlaceType.deleteMany({ where: { placeId: id } });
      await tx.placePlaceType.createMany({
        data: resolved.types.map((t, i) => ({ placeId: id, placeTypeId: t.id, sortOrder: i })),
      });
    });
  } catch (e) {
    console.error("장소 수정 오류:", e);
    return { error: "장소를 수정하는 중 오류가 발생했습니다." };
  }
  if (returnUrl) redirect(returnUrl);
  return {};
}

// ─── 구글 맵 좌표 링크 분석 ────────────────────────────────────────────────────

export async function resolveCoordinateLink(url: string): Promise<{
  lat: number;
  lng: number;
  googleMapsUrl: string;
} | { error: string }> {
  if (!url.trim()) return { error: "URL을 입력해주세요." };

  try {
    const resolved = await resolveGoogleMapsUrl(url.trim());

    if (resolved?.type === "coord") {
      return {
        lat: resolved.lat,
        lng: resolved.lng,
        googleMapsUrl: buildMapsUrlByCoords(resolved.lat, resolved.lng),
      };
    }
    if (resolved?.type === "streetview") {
      return { error: "스트릿뷰 URL은 좌표 링크로 사용할 수 없습니다. Street View URL 필드를 사용해주세요." };
    }
    if (resolved?.type === "place") {
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
  } catch (e) {
    console.error("이미지 추가 오류:", e);
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
    // Supabase Storage 파일 삭제 (외부 URL은 스킵)
    if (img?.url) {
      const storagePath = extractStoragePath(img.url);
      if (storagePath) {
        await deleteStorageFiles("place-images", [storagePath]);
      }
    }
    revalidatePath(`/admin/places/${placeId}/edit`);
    return {};
  } catch (e) {
    console.error("이미지 삭제 오류:", e);
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
  } catch (e) {
    console.error("썸네일 변경 오류:", e);
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
  } catch (e) {
    console.error("캡션 수정 오류:", e);
    return { error: "캡션을 수정하는 중 오류가 발생했습니다." };
  }
}

export async function reorderPlaceImages(
  placeId: string,
  orderedIds: string[],
): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.placeImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    revalidatePath(`/admin/places/${placeId}/edit`);
    return {};
  } catch (e) {
    console.error("이미지 순서 변경 오류:", e);
    return { error: "이미지 순서를 변경하는 중 오류가 발생했습니다." };
  }
}
