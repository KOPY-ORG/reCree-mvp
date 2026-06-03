import { notFound } from "next/navigation";
import { getEventForEdit } from "../../_actions/event-actions";
import { EventForm, type EventInitialData } from "../../_components/EventForm";
import type { PlaceForForm } from "@/app/admin/posts/_components/PostForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventForEdit(id);
  if (!event) notFound();

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

  const initialData: EventInitialData = {
    id: event.id,
    placeId: event.placeId,
    place,
    eventCollection: event.eventCollection,
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
  };

  return <EventForm mode="edit" eventId={id} initialData={initialData} />;
}
