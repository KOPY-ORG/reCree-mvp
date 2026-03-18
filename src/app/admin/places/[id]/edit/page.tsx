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
        latitude: true,
        longitude: true,
        googlePlaceId: true,
        googleMapsUrl: true,
        naverMapsUrl: true,
        kakaoMapsUrl: true,
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
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, nameKo: true },
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
        placeTypes: place.placeTypes,
      }}
      initialPlaceImages={place.placeImages}
      allPlaceTypes={allPlaceTypes}
      allAreas={allAreas}
    />
  );
}
