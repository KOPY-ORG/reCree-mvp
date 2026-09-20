import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlaceFormWrapper } from "../../_components/PlaceFormWrapper";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function EditPlacePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page } = await searchParams;
  const returnUrl = page && Number(page) > 1 ? `/admin/places?page=${page}` : "/admin/places";

  const [place, allPlaceTypes, allAreas] = await Promise.all([
    prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        nameKo: true,
        nameEn: true,
        addressKo: true,
        addressEn: true,
        areaId: true,
        placeTypes: true,
        // 대표 순서는 연결 행이 들고 있다 — 폼은 이 순서를 그대로 보여준다
        placePlaceTypes: {
          orderBy: { sortOrder: "asc" },
          select: { placeType: { select: { name: true } } },
        },
        latitude: true,
        longitude: true,
        googlePlaceId: true,
        googleMapsUrl: true,
        naverMapsUrl: true,
        kakaoMapsUrl: true,
        amapUrl: true,
        streetViewUrl: true,
        phone: true,
        operatingHours: true,
        gettingThere: true,
        status: true,
        isVerified: true,
        placeImages: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            url: true,
            isThumbnail: true,
            sortOrder: true,
            caption: true,
          },
        },
      },
    }),
    prisma.placeType.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, nameKo: true, category: true, isDefault: true },
    }),
    prisma.area.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameKo: true, level: true, parentId: true },
    }),
  ]);

  if (!place) notFound();

  return (
    <PlaceFormWrapper
      mode="edit"
      placeId={place.id}
      returnUrl={returnUrl}
      initialData={{
        ...place,
        operatingHours: (place.operatingHours as string[] | null) ?? null,
        gettingThere: place.gettingThere ?? null,
        areaId: place.areaId ?? null,
        // 연결 행이 있으면 그 순서가 기준이다. 없는 옛 장소만 이름 배열로 되돌아간다
        placeTypes: place.placePlaceTypes.length
          ? place.placePlaceTypes.map((l) => l.placeType.name)
          : place.placeTypes,
      }}
      initialPlaceImages={place.placeImages}
      allPlaceTypes={allPlaceTypes}
      allAreas={allAreas}
    />
  );
}
