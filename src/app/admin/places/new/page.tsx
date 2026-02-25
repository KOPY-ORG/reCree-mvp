import { prisma } from "@/lib/prisma";
import { PlaceFormWrapper } from "../_components/PlaceFormWrapper";

export default async function NewPlacePage() {
  const [allTags, allTopics] = await Promise.all([
    prisma.tag.findMany({
      where: { isActive: true },
      select: { id: true, nameKo: true, group: true, colorHex: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { nameKo: "asc" }],
    }),
    prisma.topic.findMany({
      select: {
        id: true,
        nameKo: true,
        level: true,
        parentId: true,
        colorHex: true,
        textColorHex: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { nameKo: "asc" }],
    }),
  ]);

  return <PlaceFormWrapper mode="create" allTags={allTags} allTopics={allTopics} />;
}
