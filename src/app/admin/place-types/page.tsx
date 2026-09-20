import { prisma } from "@/lib/prisma";
import { PlaceTypeClient } from "./_components/PlaceTypeClient";

export default async function PlaceTypesPage() {
  const rows = await prisma.placeType.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { placePlaceTypes: true } } },
  });
  const items = rows.map(({ _count, ...t }) => ({ ...t, usedBy: _count.placePlaceTypes }));

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">장소 유형 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          장소에 지정할 물리적 유형을 관리합니다. 카테고리는 지도 필터 칩과 배지 색을 정하고,
          기본값은 &ldquo;어느 종류인지 모른다&rdquo; 를 뜻해 카테고리당 하나만 둘 수 있습니다.
          영문 이름은 그대로 저장되니 마스터 표기(예: Convenience Store)를 지켜주세요.
        </p>
      </div>
      <PlaceTypeClient items={items} />
    </div>
  );
}
