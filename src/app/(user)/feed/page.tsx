import Link from "next/link";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel } from "../_components/HomeBannerCarousel";
import { getHomeBanners, toBannerItems } from "@/lib/home-banner-queries";
import { getPostsWithLabels, getSavedPostIds } from "@/lib/post-queries";
import { getCuratedSections, getSectionData, getPostMoreHref, type SectionData } from "@/lib/curation-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";

import { PostCard } from "../_components/PostCard";
import { GuideVideoCard } from "../_components/GuideVideoCard";
import { getCurrentUser } from "@/lib/auth";
import { getMyFollows } from "@/lib/follow-queries";
import { resolveFeedTab } from "@/lib/feed-tabs";
import { HomeTabBar, type TabTopic } from "./_components/HomeTabBar";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { fetchLatestFeed } from "../_actions/feed-actions";
import { InfiniteFeed } from "../_components/InfiniteFeed";
import {
  getActiveEventCollections,
  getEventCollectionForMap,
  type EventCollectionForMap,
} from "@/lib/event-collection-queries";
import { EventVerticalCarousel } from "@/components/maps/EventVerticalCarousel";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;

  const currentUser = await getCurrentUser();

  // 구독 토픽은 탭바가 그리고, ?tab= 해석도 이 목록에 기댄다 — 탭을 그리기 전에 필요하다.
  // 순서는 getMyFollows 가 정한다 (sortOrder asc → createdAt desc).
  const follows = currentUser ? await getMyFollows(currentUser.id) : [];
  const tabTopics: TabTopic[] = follows.map((f) => ({
    id: f.topic.id,
    slug: f.topic.slug,
    nameEn: f.topic.nameEn,
  }));
  const activeTab = resolveFeedTab(tab, tabTopics);

  // 서로 의존하지 않는 조회는 한 번에 띄운다. 이벤트 컬렉션만 두 단계다 —
  // 목록을 받아야 각 컬렉션의 마커를 부를 수 있어 그 안에서 다시 Promise.all 한다.
  const [homeBanners, sections, tagGroupConfigs, savedPostIds, latestFeedResult, guideVideo, homeEvents] =
    await Promise.all([
      getHomeBanners(),
      getCuratedSections({ showOnHome: true }),
      prisma.tagGroupConfig.findMany({
        select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
      }),
      getSavedPostIds(currentUser?.id ?? null),
      fetchLatestFeed({}),
      prisma.guideVideo.findFirst({ where: { isActive: true } }),
      (async () => {
        const collections = await getActiveEventCollections();
        const mapData: Record<string, EventCollectionForMap | null> = Object.fromEntries(
          await Promise.all(
            collections.map(async (c) => [c.slug, await getEventCollectionForMap(c.slug)] as const)
          )
        );
        return { collections, mapData };
      })(),
    ]);

  const homeFirstColData = homeEvents.collections[0]
    ? (homeEvents.mapData[homeEvents.collections[0].slug] ?? null)
    : null;

  // sections 를 받아야 각 섹션의 콘텐츠를 부를 수 있어 여기 남는다
  const sectionData: SectionData[] = await getSectionData(sections);

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);

  // ─── 폴백 ───────────────────────────────────────────────────────────────────

  if (!hasBanners && !hasSections) {
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
        <HomeTabBar activeTab={activeTab} topics={tabTopics} isLoggedIn={!!currentUser} />
        <div className="grid grid-cols-2 gap-3">
          {fallbackPosts.map((post, index) => (
            <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} variant="grid" priority={index === 0} />
          ))}
        </div>
      </div>
    );
  }

  // 배너 props 변환
  const bannerItems = toBannerItems(homeBanners, tagGroupMap, savedPostIds);

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pt-2 pb-4 max-w-2xl mx-auto">
      <HomeTabBar activeTab={activeTab} topics={tabTopics} isLoggedIn={!!currentUser} />

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
    </div>
  );
}
