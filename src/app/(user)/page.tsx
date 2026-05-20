import Link from "next/link";
import { ChevronRight, Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel, type BannerItem } from "./_components/HomeBannerCarousel";
import { getPostsWithLabels, getSavedPostIds, type PostItem } from "@/lib/post-queries";
import {
  resolveTopicColors,
  resolveTagColors,
  K_MEDIA_GROUP,
  selectHomeLabels,
  type LabelSlot,
  type ColorNode,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";

/** 홈 배너용 라벨 2개 선택 — PostCard home variant와 동일한 규칙 */
function resolveBannerLabels(
  postTopics: { isVisible: boolean; displayOrder: number; topic: { nameEn: string; colorHex?: string | null; colorHex2?: string | null; gradientDir?: string; gradientStop?: number; textColorHex?: string | null; parent?: ColorNode | null } }[],
  postTags:   { isVisible: boolean; displayOrder: number; tag:   { name: string; group: string; colorHex?: string | null; colorHex2?: string | null; textColorHex?: string | null } }[],
  tagGroupMap: TagGroupColorMap,
): ResolvedLabel[] {
  const topicSlots: LabelSlot[] = postTopics
    .filter((t) => t.isVisible)
    .map((t) => ({ group: "TOPIC", name: t.topic.nameEn, displayLabel: null, colors: resolveTopicColors(t.topic) }));

  const otherSlots: LabelSlot[] = postTags
    .filter((t) => t.isVisible && t.tag.group !== K_MEDIA_GROUP)
    .map((t) => {
      const gc = tagGroupMap.get(t.tag.group);
      return { group: t.tag.group, name: t.tag.name, displayLabel: gc?.displayLabel ?? null, colors: resolveTagColors(t.tag, gc) };
    });

  return selectHomeLabels(topicSlots, otherSlots);
}
import { PostCard } from "./_components/PostCard";
import { SearchBar } from "./_components/SearchBar";
import { GuideVideoCard } from "./_components/GuideVideoCard";
import { getCurrentUser } from "@/lib/auth";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { getMyFollows } from "@/lib/follow-queries";

// ─── 가로 스크롤 섹션 ────────────────────────────────────────────────────────

function HScrollSection({
  title,
  moreHref,
  children,
}: {
  title: string;
  moreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-bold text-lg">{title}</h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            More <ChevronRight className="size-3.5" />
          </Link>
        )}
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

// ─── 탭 바 ───────────────────────────────────────────────────────────────────

function TabBar({ activeTab }: { activeTab: "highlights" | "follow" }) {
  return (
    <div className="flex border-b border-secondary mb-4">
      <Link
        href="/"
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          activeTab === "highlights"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Highlights
      </Link>
      <Link
        href="/?tab=follow"
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          activeTab === "follow"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Follow
      </Link>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "follow" ? "follow" : "highlights";

  const currentUser = await getCurrentUser();

  const guideVideo = await prisma.guideVideo.findFirst({ where: { isActive: true } });

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
              select: { url: true, focalX: true, focalY: true, zoom: true },
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
      select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
    getSavedPostIds(currentUser?.id ?? null),
  ]);

  type SectionData =
    | { kind: "posts"; items: PostItem[] }
    | { kind: "reCreeshots"; items: { id: string; imageUrl: string; matchScore: number | null; showBadge: boolean; referencePhotoUrl: string | null }[] };

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
              : section.filterTagGroup
              ? { reCreeshotTags: { some: { tag: { group: section.filterTagGroup } } } }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: section.maxCount,
          select: { id: true, imageUrl: true, matchScore: true, showBadge: true, referencePhotoUrl: true },
        });
        return { kind: "reCreeshots", items };
      }

      // postIds가 지정된 경우(MANUAL 또는 AUTO 고정 순서): 해당 포스트를 그 순서로 표시
      if (section.postIds.length > 0) {
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

      // MANUAL인데 postIds가 없으면 빈 섹션
      if (section.type === "MANUAL") return { kind: "posts", items: [] };

      // AUTO: 필터 + 자동 정렬
      const items = await getPostsWithLabels(
        {
          status: "PUBLISHED",
          ...(section.filterTopicId
            ? { postTopics: { some: { topicId: section.filterTopicId } } }
            : {}),
          ...(section.filterTagId
            ? { postTags: { some: { tagId: section.filterTagId } } }
            : section.filterTagGroup
            ? { postTags: { some: { tag: { group: section.filterTagGroup } } } }
            : {}),
        },
        {
          take: section.maxCount,
          orderBy: section.type === "AUTO_HOT" ? { viewCount: "desc" } : { createdAt: "desc" },
        }
      );
      return { kind: "posts", items };
    })
  );

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);

  // Follow 탭 데이터 (tab=follow이고 로그인 상태일 때만)
  let followPosts: PostItem[] = [];
  let followedIds: string[] = [];
  if (activeTab === "follow" && currentUser) {
    const follows = await getMyFollows(currentUser.id);
    followedIds = follows.map((f) => f.topic.id);
    if (followedIds.length > 0) {
      followPosts = await getPostsWithLabels(
        {
          status: "PUBLISHED",
          postTopics: { some: { topicId: { in: followedIds } } },
        },
        { take: 20, orderBy: { createdAt: "desc" } }
      );
    }
  }

  // ─── 폴백 ───────────────────────────────────────────────────────────────────

  if (!hasBanners && !hasSections && activeTab !== "follow") {
    const fallbackPosts = await getPostsWithLabels(
      { status: "PUBLISHED" },
      { orderBy: { createdAt: "desc" } }
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
        <TabBar activeTab={activeTab} />
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
    const labels = resolveBannerLabels(b.post.postTopics, b.post.postTags, tagGroupMap);
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
      zoom: b.post.postImages[0]?.zoom ?? null,
      labels,
    };
  });

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pt-2 pb-4 max-w-2xl mx-auto">
      <div className="px-4 mb-3">
        <SearchBar />
      </div>
      <TabBar activeTab={activeTab} />

      {activeTab === "follow" ? (
        !currentUser ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center px-4">
            <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Sign in to follow topics</p>
              <p className="text-sm text-muted-foreground">
                Follow K-POP and K-CONTENT topics to see posts here.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
            >
              Sign in
            </Link>
          </div>
        ) : followedIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center px-4">
            <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-lg font-semibold">No topics followed yet</p>
              <p className="text-sm text-muted-foreground">
                Follow topics to curate your own feed.
              </p>
            </div>
            <Link
              href="/topics"
              className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
            >
              Browse Topics
            </Link>
          </div>
        ) : followPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-2 text-center px-4">
            <p className="text-lg font-semibold">No posts yet</p>
            <p className="text-sm text-muted-foreground">
              Check back soon for posts from your followed topics.
            </p>
          </div>
        ) : (
          <div className="px-4 grid grid-cols-2 gap-3">
            {followPosts.map((post) => (
              <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} variant="grid" />
            ))}
          </div>
        )
      ) : (
        <>
          {hasBanners && (
            <div className="px-4 mb-4">
              <HomeBannerCarousel banners={bannerItems} />
            </div>
          )}

          {sections.map((section, i) => {
            const data = sectionData[i];
            if (!data || data.items.length === 0) return null;

            // POST AUTO 섹션은 필터 조건을 지도에 그대로 전달
            function getPostMoreHref() {
              if (section.type === "MANUAL") return "/discover";
              if (section.filterTopicId) return `/discover?view=map&topicId=${section.filterTopicId}`;
              if (section.filterTagId) return `/discover?view=map&tagId=${section.filterTagId}`;
              if (section.filterTagGroup) return `/discover?view=map&tagGroup=${section.filterTagGroup}`;
              return "/discover?view=map";
            }

            if (data.kind === "reCreeshots") {
              return (
                <HScrollSection key={section.id} title={section.titleEn}>
                  {guideVideo && (
                    <div className="shrink-0 w-[120px]">
                      <GuideVideoCard
                        videoUrl={guideVideo.videoUrl}
                        thumbnailUrl={guideVideo.thumbnailUrl}
                        titleEn={guideVideo.titleEn}
                        className="aspect-[4/5] rounded-lg"
                      />
                    </div>
                  )}
                  {data.items.map((shot) => (
                    <Link key={shot.id} href={`/discover/hall/${shot.id}`} className="shrink-0 w-[120px] block">
                      <ReCreeshotImage
                        shotUrl={shot.imageUrl}
                        referenceUrl={shot.referencePhotoUrl}
                        matchScore={shot.matchScore}
                        showBadge={shot.showBadge}
                        referencePosition="top-left"
                        badgePosition="top-right"
                        variant="thumb-sm"
                        className="aspect-[4/5]"
                        sizes="120px"
                      />
                    </Link>
                  ))}
                </HScrollSection>
              );
            }

            return (
              <HScrollSection key={section.id} title={section.titleEn} moreHref={getPostMoreHref()}>
                {data.items.map((post) => (
                  <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} />
                ))}
              </HScrollSection>
            );
          })}
          <footer className="px-4 pt-8 pb-6 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/policy/privacy" className="hover:text-foreground underline underline-offset-4">
                Privacy Policy
              </Link>
              <Link href="/policy/terms" className="hover:text-foreground underline underline-offset-4">
                Terms of Service
              </Link>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
