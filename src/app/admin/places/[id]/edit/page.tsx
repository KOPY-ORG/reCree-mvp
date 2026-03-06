import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlaceFormWrapper } from "../../_components/PlaceFormWrapper";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlacePage({ params }: Props) {
  const { id } = await params;

  const place = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      addressKo: true,
      addressEn: true,
      country: true,
      city: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
      googleMapsUrl: true,
      naverMapsUrl: true,
      kakaoMapsUrl: true,
      phone: true,
      operatingHours: true,
      status: true,
      isVerified: true,
    },
  });

  if (!place) notFound();

  return (
    <PlaceFormWrapper
      mode="edit"
      placeId={place.id}
      initialData={{
        ...place,
        operatingHours: (place.operatingHours as string[] | null) ?? null,
      }}
    />
  );
}
