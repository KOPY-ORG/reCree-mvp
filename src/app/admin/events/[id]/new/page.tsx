import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventForm } from "../../_components/EventForm";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const collection = await prisma.eventCollection.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      translations: {
        where: { locale: "ko" },
        select: { name: true },
      },
    },
  });

  if (!collection) notFound();

  return (
    <EventForm
      mode="create"
      collection={{
        id: collection.id,
        slug: collection.slug,
        nameKo: collection.translations[0]?.name ?? collection.slug,
      }}
    />
  );
}
