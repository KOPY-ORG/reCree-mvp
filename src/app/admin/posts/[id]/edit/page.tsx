import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm } from "../../_components/PostForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;

  const [post, allTags, allTopics] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        postTopics: { select: { topicId: true } },
        postTags: { select: { tagId: true } },
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

  if (!post) notFound();

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
    />
  );
}
