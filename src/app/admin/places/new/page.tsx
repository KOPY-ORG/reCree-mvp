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
      select: { id: true, nameKo: true, level: true, parentId: true },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { nameKo: "asc" }],
    }),
  ]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">새 장소 등록</h1>
        <p className="text-sm text-muted-foreground mt-1">
          K-콘텐츠 관련 새 장소를 등록합니다.
        </p>
      </div>
      <PlaceFormWrapper mode="create" allTags={allTags} allTopics={allTopics} />
    </div>
  );
}
