import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlaceFormWrapper } from "../../_components/PlaceFormWrapper";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlacePage({ params }: Props) {
  const { id } = await params;

  const [place, allTags, allTopics] = await Promise.all([
    prisma.place.findUnique({
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
        phone: true,
        operatingHours: true,
        status: true,
        isVerified: true,
        placeTags: { select: { tagId: true } },
        placeTopics: { select: { topicId: true } },
      },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      select: { id: true, nameKo: true, group: true, colorHex: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { nameKo: "asc" }],
    }),
    prisma.topic.findMany({
      select: {
        id: true,
        nameKo: true,
        level: true,
        parentId: true,
        colorHex: true,
        textColorHex: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { nameKo: "asc" }],
    }),
  ]);

  if (!place) notFound();

  return (
    <PlaceFormWrapper
      mode="edit"
      placeId={place.id}
      initialData={{
        ...place,
        operatingHours: (place.operatingHours as string[] | null) ?? null,
      }}
      allTags={allTags}
      allTopics={allTopics}
    />
  );
}
