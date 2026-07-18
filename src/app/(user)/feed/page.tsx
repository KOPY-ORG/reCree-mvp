import Link from "next/link";
import { Heart } from "lucide-react";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel, type BannerItem } from "../_components/HomeBannerCarousel";
import { getPostsWithLabels, getSavedPostIds, type PostItem } from "@/lib/post-queries";
import { getCuratedSections, getSectionData, getPostMoreHref, type SectionData } from "@/lib/curation-queries";
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
import { PostCard } from "../_components/PostCard";
import { GuideVideoCard } from "../_components/GuideVideoCard";
import { getCurrentUser } from "@/lib/auth";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { fetchLatestFeed, fetchFollowFeed } from "../_actions/feed-actions";
import { InfiniteFeed } from "../_components/InfiniteFeed";
import {
  getActiveEventCollections,
  getEventCollectionForMap,
  type EventCollectionForMap,
} from "@/lib/event-collection-queries";
import { EventVerticalCarousel } from "@/components/maps/EventVerticalCarousel";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

// ─── 탭 바 ───────────────────────────────────────────────────────────────────

function TabBar({ activeTab }: { activeTab: "highlights" | "follow" }) {
  return (
    <div className="flex border-b border-secondary mb-4">
      <Link
        href="/feed"
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          activeTab === "highlights"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Highlights
      </Link>
      <Link
        href="/feed?tab=follow"
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          activeTab === "follow"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Following
      </Link>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "follow" ? "follow" : "highlights";

  const currentUser = await getCurrentUser();

  const guideVideo = await prisma.guideVideo.findFirst({ where: { isActive: true } });

  const [homeBanners, sections, tagGroupConfigs, savedPostIds, latestFeedResult] = await Promise.all([
    prisma.homeBanner.findMany({
      where: { isActive: true, post: { isShop: false } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        post: {
          select: {
            id: true,
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
    getCuratedSections({ showOnHome: true }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
    getSavedPostIds(currentUser?.id ?? null),
    fetchLatestFeed({}),
  ]);

  // 이벤트 캐러셀 데이터 — 기존 Promise.all과 독립
  const homeEventCollections = await getActiveEventCollections();
  const homeEventMapData: Record<string, EventCollectionForMap | null> = Object.fromEntries(
    await Promise.all(
      homeEventCollections.map(async (c) => [c.slug, await getEventCollectionForMap(c.slug)] as const)
    )
  );
  const homeFirstColData = homeEventCollections[0]
    ? (homeEventMapData[homeEventCollections[0].slug] ?? null)
    : null;

  const sectionData: SectionData[] = await getSectionData(sections);

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);

  // Follow 탭 첫 페이지 SSR (인증·팔로우 필터는 fetchFollowFeed 내부에서 처리)
  let followFirstPosts: PostItem[] = [];
  let followInitialCursor: string | null = null;
  if (activeTab === "follow") {
    const followResult = await fetchFollowFeed({});
    followFirstPosts = followResult.posts;
    followInitialCursor = followResult.nextCursor;
  }

  // ─── 폴백 ───────────────────────────────────────────────────────────────────

  if (!hasBanners && !hasSections && activeTab !== "follow") {
    const fallbackPosts = await getPostsWithLabels(
      { status: "PUBLISHED", isShop: false },
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
        <TabBar activeTab={activeTab} />
        <div className="grid grid-cols-2 gap-3">
          {fallbackPosts.map((post, index) => (
            <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} variant="grid" priority={index === 0} />
          ))}
        </div>
      </div>
    );
  }

  // 배너 props 변환
  const bannerItems: BannerItem[] = homeBanners.map((b) => {
    const labels = resolveBannerLabels(b.post.postTopics, b.post.postTags, tagGroupMap);
    return {
      id: b.post.id,
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
      isSaved: savedPostIds.has(b.post.id),
    };
  });

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pt-2 pb-4 max-w-2xl mx-auto">
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
        ) : followFirstPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center px-4">
            <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-lg font-semibold">No posts yet</p>
              <p className="text-sm text-muted-foreground">
                Follow topics to see posts here.
              </p>
            </div>
            <Link
              href="/topics"
              className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
            >
              Browse Topics
            </Link>
          </div>
        ) : (
          <div className="px-4">
            <InfiniteFeed
              fetchFn={fetchFollowFeed}
              initialPosts={followFirstPosts}
              initialCursor={followInitialCursor}
              savedIds={[...savedPostIds]}
              tagGroupMap={tagGroupMap}
            />
          </div>
        )
      ) : (
        <>
          {hasBanners && (
            <div className="mb-4">
              <HomeBannerCarousel banners={bannerItems} />
            </div>
          )}

          {homeFirstColData && (
            <div className="mb-6">
              <EventVerticalCarousel
                title="BTS THE CITY ARIRANG LONDON"
                events={homeFirstColData.markers}
                collectionSlug={homeFirstColData.collection.slug}
                collectionName={homeFirstColData.collection.nameEn}
              />
            </div>
          )}

          {sections.map((section, i) => {
            const data = sectionData[i];
            if (!data || data.items.length === 0) return null;

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
                    <Link key={shot.id} href={`/recreeshot/${shot.id}`} className="shrink-0 w-[120px] block">
                      <ReCreeshotImage
                        shotUrl={shot.imageUrl}
                        variant="thumb-sm"
                        className="aspect-[4/5] [filter:drop-shadow(0_3px_5px_rgba(0,0,0,0.18))]"
                        sizes="120px"
                      />
                    </Link>
                  ))}
                </HScrollSection>
              );
            }

            return (
              <HScrollSection key={section.id} title={section.titleEn} moreHref={getPostMoreHref(section)}>
                {data.items.map((post, index) => (
                  <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} priority={index === 0} />
                ))}
              </HScrollSection>
            );
          })}
          <div className="px-4 mb-4">
            <FeedbackForm source="feed" />
          </div>

          <div className="flex items-center justify-between mb-3 px-4 mt-2">
            <h2 className="font-bold text-lg">Fresh Drops</h2>
          </div>
          <div className="px-4">
            <InfiniteFeed
              initialPosts={latestFeedResult.posts}
              initialCursor={latestFeedResult.nextCursor}
              savedIds={[...savedPostIds]}
              tagGroupMap={tagGroupMap}
              fetchFn={fetchLatestFeed}
            />
          </div>

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
