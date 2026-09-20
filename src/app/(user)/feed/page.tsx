import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HomeBannerCarousel } from "../_components/HomeBannerCarousel";
import { getHomeBanners, toBannerItems } from "@/lib/home-banner-queries";
import { getSavedPostIds } from "@/lib/post-queries";
import { getCuratedSections, getSectionData, type SectionData } from "@/lib/curation-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";

import { getCurrentUser } from "@/lib/auth";
import { getMyFollows } from "@/lib/follow-queries";
import { resolveFeedTab } from "@/lib/feed-tabs";
import { type TabTopic } from "./_components/HomeTabBar";
import { HomeTopBar } from "./_components/HomeTopBar";
import { CuratedSections } from "./_components/CuratedSections";
import { KoreaMapCard } from "./_components/KoreaMapCard";
import { FreshDrops } from "./_components/FreshDrops";
import { getSidoPlaceCounts } from "@/lib/area-queries";
import { fetchLatestFeed } from "../_actions/feed-actions";
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

  // 서로 의존하지 않는 조회는 한 번에 띄운다
  const [homeBanners, sections, tagGroupConfigs, savedPostIds, latestFeedResult, guideVideo, sidoCounts] =
    await Promise.all([
      getHomeBanners(),
      getCuratedSections({ showOnHome: true }),
      prisma.tagGroupConfig.findMany({
        select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
      }),
      getSavedPostIds(currentUser?.id ?? null),
      fetchLatestFeed({}),
      prisma.guideVideo.findFirst({ where: { isActive: true } }),
      getSidoPlaceCounts(),
    ]);

  // sections 를 받아야 각 섹션의 콘텐츠를 부를 수 있어 여기 남는다
  const sectionData: SectionData[] = await getSectionData(sections);

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const hasBanners = homeBanners.length > 0;
  const hasSections = sectionData.some((d) => d.items.length > 0);
  // Fresh Drops 가 쓰는 결과를 그대로 본다 — 빈 상태를 알려고 따로 조회하지 않는다
  const hasLatest = latestFeedResult.posts.length > 0;
  const isEmpty = !hasBanners && !hasSections && !hasLatest;

  // 배너 props 변환
  const bannerItems = toBannerItems(homeBanners, tagGroupMap, savedPostIds);

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* 상단 바는 어떤 경우에도 남는다. 볼 게 없는 화면일수록 다른 탭으로 갈 길이 필요하다 */}
      <HomeTopBar activeTab={activeTab} topics={tabTopics} isLoggedIn={!!currentUser} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center px-4">
          <p className="text-lg font-semibold">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">New spots are on the way. Check back soon.</p>
        </div>
      ) : (
        <>
          {hasBanners && (
            <div className="mb-4">
              <HomeBannerCarousel banners={bannerItems} />
            </div>
          )}

          {/* 본문에 탭 분기가 아직 없다 (E4). 지금은 이 카드에만 조건을 건다 */}
          {activeTab.kind === "hot" && (
            <KoreaMapCard
              counts={sidoCounts.counts}
              maxCount={sidoCounts.maxCount}
              accentColor="var(--brand)"
            />
          )}

          <CuratedSections
            sections={sections}
            sectionData={sectionData}
            tagGroupMap={tagGroupMap}
            savedPostIds={savedPostIds}
            guideVideo={guideVideo}
          />
        </>
      )}

      <div className="px-4 mb-4">
        <FeedbackForm source="feed" />
      </div>

      {hasLatest && (
        <FreshDrops
          initialPosts={latestFeedResult.posts}
          initialCursor={latestFeedResult.nextCursor}
          savedPostIds={savedPostIds}
          tagGroupMap={tagGroupMap}
        />
      )}

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
