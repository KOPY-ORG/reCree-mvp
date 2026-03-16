import { prisma } from "@/lib/prisma";
import { PlaceFormWrapper } from "../_components/PlaceFormWrapper";

export default async function NewPlacePage() {
  const [allPlaceTypes, allAreas] = await Promise.all([
    prisma.placeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, nameKo: true },
    }),
    prisma.area.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameKo: true, level: true, parentId: true },
    }),
  ]);

  return <PlaceFormWrapper mode="create" allPlaceTypes={allPlaceTypes} allAreas={allAreas} />;
}
