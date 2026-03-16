import { prisma } from "@/lib/prisma";
import { PlaceTypeClient } from "./_components/PlaceTypeClient";

export default async function PlaceTypesPage() {
  const items = await prisma.placeType.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">장소 유형 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          장소에 지정할 물리적 유형을 관리합니다. 영문 키(소문자_언더스코어)와 한글명을 함께 입력하세요.
        </p>
      </div>
      <PlaceTypeClient items={items} />
    </div>
  );
}
