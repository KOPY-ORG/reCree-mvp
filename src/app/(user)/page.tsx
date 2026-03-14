import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel, type BannerItem } from "./_components/HomeBannerCarousel";
import { getPostsWithLabels, getSavedPostIds, type PostItem } from "@/lib/post-queries";
import {
  resolveTopicColors,
  resolveTagColors,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import { PostCard } from "./_components/PostCard";
import { SearchBar } from "./_components/SearchBar";
import { getCurrentUser } from "@/lib/auth";

// ─── 가로 스크롤 섹션 ────────────────────────────────────────────────────────

function HScrollSection({
  title,
  moreHref,
  children,
}: {
  title: string;
  moreHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-bold text-lg">{title}</h2>
        <Link
          href={moreHref}
          className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
        >
          More <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pl-4 pb-1">
          {children}
          <div className="shrink-0 w-4" />
        </div>
      </div>
    </section>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  const [homeBanners, sections, tagGroupConfigs, savedPostIds] = await Promise.all([
    prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        post: {
          select: {
            slug: true,
            titleEn: true,
            postImages: {
              where: { isThumbnail: true },
              select: { url: true, focalX: true, focalY: true },
              take: 1,
            },
            postTopics: {
              orderBy: { displayOrder: "asc" },
              select: {
                topicId: true,
                isVisible: true,
                displayOrder: true,
                topic: {
                  select: {
                    nameEn: true,
                    colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                    parent: {
                      select: {
                        colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                        parent: {
                          select: {
                            colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                            parent: { select: { colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            postTags: {
              orderBy: { displayOrder: "asc" },
              select: {
                tagId: true,
                isVisible: true,
                displayOrder: true,
                tag: {
                  select: {
                    name: true, group: true,
                    colorHex: true, colorHex2: true, textColorHex: true,
                  },
                },
              },
            },
            postPlaces: {
              take: 1,
              select: {
                place: { select: { nameEn: true, nameKo: true } },
              },
            },
          },
        },
      },
    }),
    prisma.curatedSection.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
    getSavedPostIds(currentUser?.id ?? null),
  ]);

  type SectionData =
    | { kind: "posts"; items: PostItem[] }
    | { kind: "reCreeshots"; items: { id: string; imageUrl: string; matchScore: number | null; showBadge: boolean }[] };

  const sectionData: SectionData[] = await Promise.all(
    sections.map(async (section): Promise<SectionData> => {
      if (section.contentType === "RECREESHOT") {
        const items = await prisma.reCreeshot.findMany({
          where: {
            status: "ACTIVE",
            ...(section.filterTopicId
              ? { reCreeshotTopics: { some: { topicId: section.filterTopicId } } }
              : {}),
            ...(section.filterTagId
              ? { reCreeshotTags: { some: { tagId: section.filterTagId } } }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: section.maxCount,
          select: { id: true, imageUrl: true, matchScore: true, showBadge: true },
        });
        return { kind: "reCreeshots", items };
      }

      if (section.type === "MANUAL") {
        if (section.postIds.length === 0) return { kind: "posts", items: [] };
        const posts = await getPostsWithLabels({
          id: { in: section.postIds },
          status: "PUBLISHED",
        });
        const map = new Map(posts.map((p) => [p.id, p]));
        return {
          kind: "posts",
          items: section.postIds.map((id) => map.get(id)).filter((p): p is PostItem => !!p),
        };
      }

      const items = await getPostsWithLabels(
        {
          status: "PUBLISHED",
          ...(section.filterTopicId
            ? { postTopics: { some: { topicId: section.filterTopicId } } }
            : {}),
          ...(section.filterTagId
            ? { postTags: { some: { tagId: section.filterTagId } } }
            : {}),
        },
        {
          take: section.maxCount,
          orderBy: section.type === "AUTO_HOT" ? { viewCount: "desc" } : { publishedAt: "desc" },
        }
      );
      return { kind: "posts", items };
    })
  );

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);

  // ─── 폴백 ───────────────────────────────────────────────────────────────────

  if (!hasBanners && !hasSections) {
    const fallbackPosts = await getPostsWithLabels(
      { status: "PUBLISHED" },
      { orderBy: { publishedAt: "desc" } }
    );

    if (fallbackPosts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-center px-4">
          <p className="text-lg font-semibold">reCree</p>
          <p className="text-sm text-muted-foreground">No posts yet. Check back soon!</p>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <div className="mb-5"><SearchBar /></div>
        <div className="grid grid-cols-2 gap-3">
          {fallbackPosts.map((post) => (
            <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} variant="grid" />
          ))}
        </div>
      </div>
    );
  }

  // 배너 props 변환
  const bannerItems: BannerItem[] = homeBanners.map((b) => {
    const topicLabel = b.post.postTopics
      .filter((t) => t.isVisible)
      .slice(0, 1)
      .map((t) => ({ text: t.topic.nameEn, ...resolveTopicColors(t.topic) }));

    const tagLabel = b.post.postTags
      .filter((t) => t.isVisible)
      .slice(0, 1)
      .map((t) => ({ text: t.tag.name, ...resolveTagColors(t.tag, tagGroupMap.get(t.tag.group)) }));

    return {
      slug: b.post.slug,
      titleEn: b.post.titleEn,
      displayName:
        b.post.postPlaces[0]?.place.nameEn ??
        b.post.postPlaces[0]?.place.nameKo ??
        b.post.titleEn,
      thumbnailUrl: b.post.postImages[0]?.url ?? null,
      focalX: b.post.postImages[0]?.focalX ?? null,
      focalY: b.post.postImages[0]?.focalY ?? null,
      labels: [...topicLabel, ...tagLabel],
    };
  });

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pt-2 pb-4 max-w-2xl mx-auto">
      <div className="px-4 mb-3">
        <SearchBar />
      </div>

      {hasBanners && (
        <div className="px-4 mb-4">
          <HomeBannerCarousel banners={bannerItems} />
        </div>
      )}

      {sections.map((section, i) => {
        const data = sectionData[i];
        if (!data || data.items.length === 0) return null;

        if (data.kind === "reCreeshots") {
          return (
            <HScrollSection key={section.id} title={section.titleEn} moreHref="/explore?tab=hall">
              {data.items.map((shot) => (
                <div key={shot.id} className="shrink-0 w-[120px]">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={shot.imageUrl}
                      alt="recreeshot"
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                    {shot.matchScore != null && shot.showBadge && (
                      <span className="absolute top-2 right-2 bg-brand text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {Math.round(shot.matchScore)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </HScrollSection>
          );
        }

        return (
          <HScrollSection key={section.id} title={section.titleEn} moreHref="/explore">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} />
            ))}
          </HScrollSection>
        );
      })}
    </div>
  );
}
