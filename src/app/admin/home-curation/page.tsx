import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BannerTab, type BannerRow } from "./_components/BannerTab";
import { SectionTab, type SectionRow } from "./_components/SectionTab";
import type { PickablePost } from "./_components/PostPickerDialog";

const DEFAULT_COLOR = "#C8FF09";
const DEFAULT_TEXT = "#000000";

export default async function HomeCurationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "banner" } = await searchParams;

  const [homeBanners, sections, publishedPosts, topics, tags, tagGroupConfigs] =
    await Promise.all([
      prisma.homeBanner.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          postId: true,
          order: true,
          isActive: true,
          labelOverrides: true,
          post: {
            select: {
              slug: true,
              titleEn: true,
              postImages: {
                where: { isThumbnail: true },
                select: { url: true },
                take: 1,
              },
              postTopics: {
                select: {
                  topicId: true,
                  isVisible: true,
                  topic: {
                    select: {
                      nameEn: true,
                      colorHex: true,
                      textColorHex: true,
                      parent: {
                        select: { colorHex: true, textColorHex: true },
                      },
                    },
                  },
                },
              },
              postTags: {
                select: {
                  tagId: true,
                  isVisible: true,
                  tag: {
                    select: {
                      name: true,
                      group: true,
                      colorHex: true,
                      textColorHex: true,
                    },
                  },
                },
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
          maxCount: true,
          order: true,
          isActive: true,
        },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
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
            where: { isVisible: true },
            orderBy: { displayOrder: "asc" },
            take: 3,
            select: {
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
        select: { group: true, colorHex: true, textColorHex: true },
      }),
    ]);

  // effective color 계산
  const tagGroupMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const bannerRows: BannerRow[] = homeBanners.map((b) => ({
    id: b.id,
    postId: b.postId,
    order: b.order,
    isActive: b.isActive,
    labelOverrides: b.labelOverrides as BannerRow["labelOverrides"],
    post: {
      slug: b.post.slug,
      titleEn: b.post.titleEn,
      thumbnailUrl: b.post.postImages[0]?.url ?? null,
    },
    postTopics: b.post.postTopics.map((pt) => {
      const p = pt.topic.parent;
      return {
        topicId: pt.topicId,
        nameEn: pt.topic.nameEn,
        isVisible: pt.isVisible,
        effectiveColorHex: pt.topic.colorHex ?? p?.colorHex ?? DEFAULT_COLOR,
        effectiveTextColorHex: pt.topic.textColorHex ?? p?.textColorHex ?? DEFAULT_TEXT,
      };
    }),
    postTags: b.post.postTags.map((pt) => {
      const gc = tagGroupMap.get(pt.tag.group);
      return {
        tagId: pt.tagId,
        name: pt.tag.name,
        isVisible: pt.isVisible,
        effectiveColorHex: pt.tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
        effectiveTextColorHex: pt.tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
      };
    }),
  }));

  const sectionRows: SectionRow[] = sections;
  const pickablePosts: PickablePost[] = publishedPosts.map((p) => ({
    id: p.id,
    titleEn: p.titleEn,
    titleKo: p.titleKo,
    thumbnailUrl: p.postImages[0]?.url ?? null,
    topicLabels: p.postTopics.map(({ topic }) => ({
      id: topic.id,
      nameEn: topic.nameEn,
      colorHex: topic.colorHex ?? topic.parent?.colorHex ?? null,
    })),
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
        />
      )}
    </div>
  );
}
