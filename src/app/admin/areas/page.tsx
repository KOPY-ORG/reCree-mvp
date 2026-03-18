import { prisma } from "@/lib/prisma";
import { AreaClient } from "./_components/AreaClient";

export default async function AreasPage() {
  const items = await prisma.area.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">지역 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          장소에 지정할 지역(도시 / 구역)을 관리합니다. 도시(level 0) → 구역(level 1) 2단계 계층입니다.
        </p>
      </div>
      <AreaClient items={items} />
    </div>
  );
}
