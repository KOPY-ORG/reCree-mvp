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
            reference: true,
            insightEn: true,
            place: { select: { nameKo: true } },
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
    source: post.source,
    postTopics: post.postTopics,
    postTags: post.postTags,
    postPlaces: post.postPlaces.map((pp) => ({
      placeId: pp.placeId,
      placeNameKo: pp.place.nameKo,
      context: pp.context,
      vibe: pp.vibe,
      mustTry: pp.mustTry,
      tip: pp.tip,
      reference: pp.reference,
      insightEn: pp.insightEn as {
        context?: string;
        mustTry?: string;
        tip?: string;
      } | null,
    })),
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
