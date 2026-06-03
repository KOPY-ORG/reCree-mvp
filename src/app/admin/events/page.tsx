import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CollectionsTable } from "./_components/CollectionsTable";

export default async function EventsPage() {
  const collections = await prisma.eventCollection.findMany({
    select: {
      id: true,
      slug: true,
      status: true,
      createdAt: true,
      _count: { select: { events: true } },
      translations: {
        where: { locale: "ko" },
        select: { name: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">이벤트 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            컬렉션을 선택해 이벤트를 관리합니다.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/admin/events/collections/new">
            <Plus className="h-4 w-4 mr-1.5" />
            새 컬렉션
          </Link>
        </Button>
      </div>

      <CollectionsTable collections={collections} />
    </div>
  );
}
