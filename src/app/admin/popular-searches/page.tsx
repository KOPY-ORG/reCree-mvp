import { prisma } from "@/lib/prisma";
import { PopularSearchClient } from "./_components/PopularSearchClient";

export default async function PopularSearchesPage() {
  const items = await prisma.popularSearch.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">인기 검색어 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          검색 페이지에 노출되는 인기 검색어를 관리합니다.
        </p>
      </div>
      <PopularSearchClient items={items} />
    </div>
  );
}
