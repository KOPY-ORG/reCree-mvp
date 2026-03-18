import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { ReCreeshotUploadFlow } from "./_components/ReCreeshotUploadFlow";

interface PageProps {
  searchParams: Promise<{ postId?: string; referenceUrl?: string }>;
}

export default async function HallNewPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { postId, referenceUrl } = await searchParams;

  const [tagGroups, topics] = await Promise.all([
    getTagGroupsWithTags(),
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true, level: true, parentId: true },
    }),
  ]);

  // postId가 있으면 장소/태그/토픽 prefill 조회
  let prefillPostId: string | undefined;
  let prefillReferenceUrl: string | undefined;
  let prefillPlace: { id: string; nameEn: string | null; nameKo: string | null; addressEn: string | null; imageUrl: string | null } | undefined;
  let prefillTagIds: string[] = [];
  let prefillTopicIds: string[] = [];

  if (postId) {
    const post = await prisma.post.findUnique({
      where: { id: postId, status: "PUBLISHED" },
      select: {
        id: true,
        recreePhotoUrl: true,
        postPlaces: {
          take: 1,
          select: {
            place: { select: { id: true, nameEn: true, nameKo: true, addressEn: true, imageUrl: true } },
          },
        },
        postTags: { where: { isVisible: true }, select: { tag: { select: { id: true } } } },
        postTopics: { where: { isVisible: true }, select: { topic: { select: { id: true } } } },
      },
    });
    if (post) {
      prefillPostId = post.id;
      // 관리자가 설정한 기준 이미지 우선, 없으면 query param fallback
      prefillReferenceUrl = post.recreePhotoUrl ?? referenceUrl;
      prefillPlace = post.postPlaces[0]?.place;
      prefillTagIds = post.postTags.map((t) => t.tag.id);
      prefillTopicIds = post.postTopics.map((t) => t.topic.id);
    }
  }

  return (
    <ReCreeshotUploadFlow
      tagGroups={tagGroups}
      topics={topics}
      userId={currentUser.id}
      prefillPostId={prefillPostId}
      prefillReferenceUrl={prefillReferenceUrl}
      prefillPlace={prefillPlace}
      prefillTagIds={prefillTagIds}
      prefillTopicIds={prefillTopicIds}
    />
  );
}
