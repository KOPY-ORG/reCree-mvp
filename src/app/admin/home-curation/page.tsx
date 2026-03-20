import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BannerTab, type BannerRow } from "./_components/BannerTab";
import { SectionTab, type SectionRow } from "./_components/SectionTab";
import type { PickablePost } from "./_components/PostPickerDialog";

export default async function HomeCurationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "banner" } = await searchParams;

  const [homeBanners, sections, publishedPosts, topics, tags, tagGroups] =
    await Promise.all([
      prisma.homeBanner.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          postId: true,
          order: true,
          isActive: true,
          post: {
            select: {
              slug: true,
              titleEn: true,
              postImages: {
                where: { isThumbnail: true },
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.curatedSection.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          titleEn: true,
          contentType: true,
          type: true,
          postIds: true,
          filterTopicId: true,
          filterTagId: true,
          filterTagGroup: true,
          maxCount: true,
          order: true,
          isActive: true,
        },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          titleEn: true,
          titleKo: true,
          postImages: {
            where: { isThumbnail: true },
            select: { url: true },
            take: 1,
          },
          postTopics: {
            orderBy: { displayOrder: "asc" },
            select: {
              isVisible: true,
              topic: {
                select: {
                  id: true,
                  nameEn: true,
                  colorHex: true,
                  parent: { select: { colorHex: true } },
                },
              },
            },
          },
          postTags: {
            select: { tag: { select: { id: true, group: true } } },
          },
        },
      }),
      prisma.topic.findMany({
        where: { isActive: true },
        orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
        select: { id: true, nameKo: true, nameEn: true },
      }),
      prisma.tag.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameKo: true, name: true },
      }),
      prisma.tagGroupConfig.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: { group: true, nameEn: true },
      }),
    ]);

  const bannerRows: BannerRow[] = homeBanners.map((b) => ({
    id: b.id,
    postId: b.postId,
    order: b.order,
    isActive: b.isActive,
    post: {
      slug: b.post.slug,
      titleEn: b.post.titleEn,
      thumbnailUrl: b.post.postImages[0]?.url ?? null,
    },
  }));

  const sectionRows: SectionRow[] = sections;
  const pickablePosts: PickablePost[] = publishedPosts.map((p) => ({
    id: p.id,
    titleEn: p.titleEn,
    titleKo: p.titleKo,
    thumbnailUrl: p.postImages[0]?.url ?? null,
    topicLabels: p.postTopics
      .filter((pt) => pt.isVisible)
      .slice(0, 3)
      .map(({ topic }) => ({
        id: topic.id,
        nameEn: topic.nameEn,
        colorHex: topic.colorHex ?? topic.parent?.colorHex ?? null,
      })),
    allTopicIds: p.postTopics.map(({ topic }) => topic.id),
    tagIds: p.postTags.map(({ tag }) => tag.id),
    tagGroups: [...new Set(p.postTags.map(({ tag }) => tag.group))],
  }));

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">홈 큐레이션</h1>
        <p className="text-sm text-muted-foreground mt-1">
          홈 화면 배너 및 큐레이션 섹션을 관리합니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-zinc-200">
        <Link
          href="?tab=banner"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "banner"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          배너 ({homeBanners.length})
        </Link>
        <Link
          href="?tab=sections"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "sections"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          큐레이션 섹션 ({sections.length})
        </Link>
      </div>

      {tab === "banner" && (
        <BannerTab initialBanners={bannerRows} publishedPosts={pickablePosts} />
      )}

      {tab === "sections" && (
        <SectionTab
          initialSections={sectionRows}
          posts={pickablePosts}
          topics={topics}
          tags={tags}
          tagGroups={tagGroups}
        />
      )}
    </div>
  );
}
