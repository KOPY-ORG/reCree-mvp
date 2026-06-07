import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { EventsGallery } from "../_components/EventsTable";
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from "../_constants";

export default async function CollectionDetailPage({
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
      status: true,
      translations: {
        where: { locale: "ko" },
        select: { name: true },
      },
      events: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          category: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          bannerImageUrl: true,
          places: {
            orderBy: { sortOrder: "asc" },
            select: { place: { select: { nameKo: true, nameEn: true } } },
          },
          translations: {
            where: { locale: "ko" },
            select: { name: true },
          },
        },
      },
    },
  });

  if (!collection) notFound();

  const nameKo = collection.translations[0]?.name ?? collection.slug;

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/events"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{nameKo}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {collection.slug}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_STATUS_COLORS[collection.status]}`}
              >
                {EVENT_STATUS_LABELS[collection.status]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/events/collections/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              컬렉션 수정
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/events/${id}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              새 이벤트
            </Link>
          </Button>
        </div>
      </div>

      {/* 이벤트 목록 */}
      <EventsGallery
        events={collection.events}
        isFiltered={false}
        collectionId={id}
      />
    </div>
  );
}
