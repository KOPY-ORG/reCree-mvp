import { prisma } from "@/lib/prisma";
import { PostForm } from "../_components/PostForm";

export default async function NewPostPage() {
  const [allTagsRaw, tagGroupConfigs, allTopics] = await Promise.all([
    prisma.tag.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameKo: true,
        group: true,
        colorHex: true,
        colorHex2: true,
        textColorHex: true,
      },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.tagGroupConfig.findMany({
      select: {
        group: true,
        nameEn: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameKo: true,
        nameEn: true,
        level: true,
        parentId: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const configMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));
  const allTags = allTagsRaw.map((tag) => ({
    ...tag,
    effectiveColorHex: tag.colorHex ?? configMap.get(tag.group)?.colorHex ?? "#C6FD09",
    effectiveColorHex2: tag.colorHex2 ?? configMap.get(tag.group)?.colorHex2 ?? null,
    effectiveGradientDir: configMap.get(tag.group)?.gradientDir ?? "to bottom",
    effectiveGradientStop: configMap.get(tag.group)?.gradientStop ?? 150,
    effectiveTextColorHex: tag.textColorHex ?? configMap.get(tag.group)?.textColorHex ?? "#000000",
  }));

  const tagGroups = tagGroupConfigs.map((c) => ({
    group: c.group,
    nameEn: c.nameEn,
  }));

  return (
    <PostForm
      mode="create"
      allTags={allTags}
      allTopics={allTopics}
      tagGroups={tagGroups}
    />
  );
}
