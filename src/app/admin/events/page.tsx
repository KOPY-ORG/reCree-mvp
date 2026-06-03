import Link from "next/link";
import { Plus } from "lucide-react";
import { type EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EventsTable } from "./_components/EventsTable";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "";

  const events = await prisma.event.findMany({
    where: {
      ...(status && { status: status as EventStatus }),
    },
    select: {
      id: true,
      status: true,
      category: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      place: { select: { nameKo: true } },
      translations: {
        where: { locale: "ko" },
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const isFiltered = !!status;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">이벤트 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ARIRANG 이벤트 관리
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4 mr-1.5" />
            새 이벤트
          </Link>
        </Button>
      </div>

      <EventsTable events={events} isFiltered={isFiltered} />
    </div>
  );
}
