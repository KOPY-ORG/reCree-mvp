import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEventForEdit } from "../../../_actions/event-actions";
import { EventForm, type EventInitialData } from "../../../_components/EventForm";
import type { PlaceForForm } from "@/app/admin/posts/_components/PostForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id, eventId } = await params;

  const [event, collection] = await Promise.all([
    getEventForEdit(eventId),
    prisma.eventCollection.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        translations: {
          where: { locale: "ko" },
          select: { name: true },
        },
      },
    }),
  ]);

  if (!event || !collection) notFound();
  if (event.eventCollectionId !== id) notFound();

  const place: PlaceForForm | null = event.place
    ? {
        id: event.placeId,
        nameKo: event.place.nameKo,
        nameEn: event.place.nameEn,
        addressKo: event.place.addressKo,
        addressEn: event.place.addressEn ?? null,
        latitude: event.place.latitude,
        longitude: event.place.longitude,
        phone: event.place.phone,
        imageUrl: event.place.imageUrl,
        placeImages: event.place.placeImages,
        rating: event.place.rating,
        status: event.place.status,
        operatingHours: event.place.operatingHours,
        googleMapsUrl: event.place.googleMapsUrl,
        naverMapsUrl: event.place.naverMapsUrl,
        gettingThere: event.place.gettingThere,
      }
    : null;

  const translations = Object.fromEntries(
    event.translations.map((t) => [
      t.locale,
      {
        name: t.name,
        eventContent: t.eventContent ?? "",
        contentDetail: t.contentDetail ?? "",
        description: t.description ?? "",
        hoursNote: t.hoursNote ?? "",
      },
    ]),
  );

  const initialData: EventInitialData = {
    id: event.id,
    placeId: event.placeId,
    place,
    eventCollectionId: event.eventCollectionId,
    category: event.category,
    startDate: event.startDate.toISOString().slice(0, 10),
    endDate: event.endDate.toISOString().slice(0, 10),
    openTime: event.openTime ?? "",
    closeTime: event.closeTime ?? "",
    entryType: event.entryType,
    reservationUrl: event.reservationUrl ?? "",
    officialUrl: event.officialUrl ?? "",
    snsUrl: event.snsUrl ?? "",
    bannerImageUrl: event.bannerImageUrl,
    status: event.status,
    showOnHome: event.showOnHome,
    sortOrder: event.sortOrder,
    translations,
  };

  return (
    <EventForm
      mode="edit"
      eventId={eventId}
      initialData={initialData}
      collection={{
        id: collection.id,
        slug: collection.slug,
        nameKo: collection.translations[0]?.name ?? collection.slug,
      }}
    />
  );
}
