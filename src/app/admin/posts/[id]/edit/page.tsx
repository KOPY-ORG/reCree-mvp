import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm } from "../../_components/PostForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;

  const [post, allTagsRaw, tagGroupConfigs, allTopics] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        postTopics: { select: { topicId: true, isVisible: true, displayOrder: true } },
        postTags: { select: { tagId: true, isVisible: true, displayOrder: true } },
        postPlaces: {
          select: {
            placeId: true,
            context: true,
            vibe: true,
            mustTry: true,
            tip: true,
            insightEn: true,
            place: {
              select: {
                nameKo: true,
                nameEn: true,
                addressKo: true,
                addressEn: true,
                latitude: true,
                longitude: true,
                phone: true,
                imageUrl: true,
              },
            },
          },
        },
        postSources: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sourceType: true,
            sourceUrl: true,
            sourceNote: true,
            sourcePostDate: true,
            referenceUrl: true,
            sortOrder: true,
          },
        },
      },
    }),
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

  if (!post) notFound();

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

  const firstPlace = post.postPlaces[0];

  const initialData = {
    id: post.id,
    titleKo: post.titleKo,
    titleEn: post.titleEn,
    slug: post.slug,
    subtitleKo: post.subtitleKo,
    subtitleEn: post.subtitleEn,
    bodyKo: post.bodyKo,
    bodyEn: post.bodyEn,
    thumbnailUrl: post.thumbnailUrl,
    status: post.status,
    memo: post.memo,
    collectedBy: post.collectedBy,
    collectedAt: post.collectedAt,
    postTopics: post.postTopics,
    postTags: post.postTags,
    postSources: post.postSources.map((s) => ({
      sourceType: s.sourceType ?? "",
      sourceUrl: s.sourceUrl ?? "",
      sourceNote: s.sourceNote ?? "",
      sourcePostDate: s.sourcePostDate ?? "",
      referenceUrl: s.referenceUrl ?? "",
    })),
    // 레거시 단일 출처 필드 (postSources가 없을 경우 폼에서 참고)
    legacySourceUrl: post.sourceUrl,
    legacySourceType: post.sourceType,
    legacySourceNote: post.sourceNote,
    postPlaces: firstPlace
      ? [
          {
            placeId: firstPlace.placeId,
            placeNameKo: firstPlace.place.nameKo,
            placeNameEn: firstPlace.place.nameEn,
            placeAddressKo: firstPlace.place.addressKo,
            placeAddressEn: firstPlace.place.addressEn,
            placeLatitude: firstPlace.place.latitude,
            placeLongitude: firstPlace.place.longitude,
            placePhone: firstPlace.place.phone,
            placeImageUrl: firstPlace.place.imageUrl,
            context: firstPlace.context,
            vibe: firstPlace.vibe,
            mustTry: firstPlace.mustTry,
            tip: firstPlace.tip,
            insightEn: firstPlace.insightEn as {
              context?: string;
              mustTry?: string;
              tip?: string;
            } | null,
          },
        ]
      : [],
  };

  return (
    <PostForm
      mode="edit"
      postId={id}
      initialData={initialData}
      allTags={allTags}
      allTopics={allTopics}
      tagGroups={tagGroups}
    />
  );
}
