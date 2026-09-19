import { Lock } from "lucide-react";
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
          장소에 지정할 지역(도시 / 구역) 목록입니다. 도시(level 0) → 구역(level 1) 2단계 계층입니다.
        </p>
        {/* 읽기 전용인 이유를 화면에서 바로 알 수 있게. 컨트롤이 그냥 없으면 고장으로 읽힌다 */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>
            지역은 TourAPI 기준으로 자동 관리됩니다. 변경은 seed 스크립트
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">prisma/scripts/seed-areas.ts</code>
            로.
          </span>
        </div>
      </div>
      <AreaClient items={items} />
    </div>
  );
}
