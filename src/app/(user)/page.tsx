import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel, type BannerItem } from "./_components/HomeBannerCarousel";
import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import {
  resolveTopicColors,
  DEFAULT_COLOR,
  DEFAULT_TEXT,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import { PostCard, PostBadges } from "./_components/PostCard";
import { SearchBar } from "./_components/SearchBar";
import { getCurrentUser } from "@/lib/auth";
import { ScrapButton } from "./_components/ScrapButton";

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function CuratedSectionRow({
  titleEn,
  posts,
  tagGroupMap,
  savedPostIds,
}: {
  titleEn: string;
  posts: PostItem[];
  tagGroupMap: TagGroupColorMap;
  savedPostIds: Set<string>;
}) {
  if (posts.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">{titleEn}</h2>
        <Link
          href="/explore"
          className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
        >
          More <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} />
        ))}
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
    currentUser
      ? prisma.save
          .findMany({
            where: { userId: currentUser.id, targetType: "POST" },
            select: { targetId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.targetId)))
      : Promise.resolve(new Set<string>()),
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
          items: section.postIds
            .map((id) => map.get(id))
            .filter((p): p is PostItem => !!p),
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
          orderBy:
            section.type === "AUTO_HOT"
              ? { viewCount: "desc" }
              : { publishedAt: "desc" },
        }
      );
      return { kind: "posts", items };
    })
  );

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);
  const showFallback = !hasBanners && !hasSections;

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  // 배너 props 변환 — effective color 계산
  type LabelOverride = { type: "topic" | "tag"; id: string };

  const bannerItems: BannerItem[] = homeBanners.map((b) => {
    const overrides = b.labelOverrides as LabelOverride[] | null;

    function buildTopicLabel(pt: typeof b.post.postTopics[number]) {
      const c = resolveTopicColors(pt.topic);
      return { text: pt.topic.nameEn, ...c };
    }

    function buildTagLabel(pt: typeof b.post.postTags[number]) {
      const { tag } = pt;
      const gc = tagGroupMap.get(tag.group);
      return {
        text: tag.name,
        colorHex: tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
        colorHex2: tag.colorHex !== null ? tag.colorHex2 : (gc?.colorHex2 ?? null),
        gradientDir: gc?.gradientDir ?? "to bottom",
        gradientStop: gc?.gradientStop ?? 150,
        textColorHex: tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
      };
    }

    let labels: BannerItem["labels"];

    if (overrides && overrides.length > 0) {
      labels = overrides
        .map((o) => {
          if (o.type === "topic") {
            const pt = b.post.postTopics.find((t) => t.topicId === o.id);
            return pt ? buildTopicLabel(pt) : null;
          } else {
            const pt = b.post.postTags.find((t) => t.tagId === o.id);
            return pt ? buildTagLabel(pt) : null;
          }
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);
    } else {
      const topicLabels = b.post.postTopics
        .filter((t) => t.isVisible)
        .map(buildTopicLabel);
      const tagLabels = b.post.postTags
        .filter((t) => t.isVisible)
        .map(buildTagLabel);
      labels = [...topicLabels, ...tagLabels].slice(0, 2);
    }

    return {
      slug: b.post.slug,
      titleEn: b.post.titleEn,
      thumbnailUrl: b.post.postImages[0]?.url ?? null,
      labels,
    };
  });

  // ─── 폴백 ───────────────────────────────────────────────────────────────────
  if (showFallback) {
    const fallbackPosts = await getPostsWithLabels(
      { status: "PUBLISHED" },
      { orderBy: { publishedAt: "desc" } }
    );

    if (fallbackPosts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-center px-4">
          <p className="text-lg font-semibold">reCree</p>
          <p className="text-sm text-muted-foreground">
            No posts yet. Check back soon!
          </p>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <SearchBar />
        <div className="grid grid-cols-2 gap-3">
          {fallbackPosts.map((post) => (
            <Link key={post.id} href={`/posts/${post.slug}`}>
              <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-muted">
                {post.postImages[0]?.url ? (
                  <Image
                    src={post.postImages[0].url}
                    alt={post.titleEn}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 672px) 50vw, 336px"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-2 left-2 right-2">
                  <PostBadges post={post} tagGroupMap={tagGroupMap} />
                </div>
                <div className="absolute bottom-2 left-2 right-10">
                  <p className="text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
                    {post.titleEn}
                  </p>
                </div>
                <div className="absolute bottom-2 right-2 z-10">
                  <ScrapButton postId={post.id} initialSaved={savedPostIds.has(post.id)} size="sm" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <SearchBar />

      {hasBanners && <HomeBannerCarousel banners={bannerItems} />}

      {sections.map((section, i) => {
        const data = sectionData[i];
        if (!data || data.items.length === 0) return null;

        if (data.kind === "reCreeshots") {
          return (
            <section key={section.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">{section.titleEn}</h2>
                <Link
                  href="/explore?tab=hall"
                  className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  More <ChevronRight className="size-3.5" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {data.items.map((shot) => (
                  <div key={shot.id} className="snap-start shrink-0 w-[120px]">
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
              </div>
            </section>
          );
        }

        return (
          <CuratedSectionRow
            key={section.id}
            titleEn={section.titleEn}
            posts={data.items}
            tagGroupMap={tagGroupMap}
            savedPostIds={savedPostIds}
          />
        );
      })}
    </div>
  );
}
