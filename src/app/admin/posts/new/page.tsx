import { prisma } from "@/lib/prisma";
import { PostForm } from "../_components/PostForm";

export default async function NewPostPage() {
  const [allTags, allTopics] = await Promise.all([
    prisma.tag.findMany({
      where: { isActive: true },
      select: { id: true, nameKo: true, group: true, colorHex: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameKo: true,
        level: true,
        parentId: true,
        colorHex: true,
        textColorHex: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return (
    <PostForm
      mode="create"
      allTags={allTags}
      allTopics={allTopics}
    />
  );
}
