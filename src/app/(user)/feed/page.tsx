import { Suspense } from "react";
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
import { FollowFeedSection } from "./_components/FollowFeedSection";
import { FollowFeedSkeleton } from "./_components/FollowFeedSkeleton";
import { PopularReCreeshotSection } from "./_components/PopularReCreeshotSection";
import { FestivalSection } from "./_components/FestivalSection";
import { FestivalSkeleton } from "./_components/FestivalSkeleton";
import { JourneySection } from "./_components/JourneySection";
import { TopicTabHeader } from "./_components/TopicTabHeader";
import { FreshDrops, HOT_TAB_MAX_ITEMS } from "./_components/FreshDrops";
import { getSidoPlaceCounts } from "@/lib/area-queries";
import { resolveTopicColors } from "@/lib/post-labels";
import { buildDiscoverHref } from "@/lib/filter-params";
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
  const isHot = activeTab.kind === "hot";

  // 아래로 내려가는 조회 조건은 이 한 줄이 전부다. Hot 은 undefined 라
  // 각 섹션이 지금까지와 똑같이 전체를 조회한다
  const topicId = activeTab.kind === "topic" ? activeTab.topicId : undefined;

  // 머리에 쓸 원본. tabTopics 는 탭바가 쓸 만큼만 남긴 것이라 색도 상위 분류도 없다.
  // resolveFeedTab 이 follows 에서 찾아 준 탭이므로 여기서 못 찾는 경우는 없다
  const activeTopic = topicId ? follows.find((f) => f.topic.id === topicId)?.topic : undefined;

  // 서로 의존하지 않는 조회는 한 번에 띄운다
  const [homeBanners, sections, tagGroupConfigs, savedPostIds, latestFeedResult, guideVideo, sidoCounts] =
    await Promise.all([
      // 배너와 큐레이션은 Hot 의 것이다. 토픽 탭에서는 그리지 않으므로 부르지도 않는다 —
      // 특히 큐레이션은 아래 getSectionData 까지 이어져 헛도는 값이 싸지 않다
      isHot ? getHomeBanners() : Promise.resolve([]),
      isHot ? getCuratedSections({ showOnHome: true }) : Promise.resolve([]),
      prisma.tagGroupConfig.findMany({
        select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
      }),
      getSavedPostIds(currentUser?.id ?? null),
      fetchLatestFeed({ topicId }),
      isHot ? prisma.guideVideo.findFirst({ where: { isActive: true } }) : Promise.resolve(null),
      getSidoPlaceCounts(topicId ?? null),
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

  // 핫스팟 색. 색은 장소가 아니라 지금 보고 있는 토픽에서 온다.
  // 배지에 쓰는 색 두 개를 그대로 넘긴다 — 카드가 SVG 그라데이션으로 옮긴다
  const topicColors = activeTopic ? resolveTopicColors(activeTopic) : null;

  // ─── 메인 렌더링 ─────────────────────────────────────────────────────────────

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* 상단 바는 어떤 경우에도 남는다. 볼 게 없는 화면일수록 다른 탭으로 갈 길이 필요하다 */}
      <HomeTopBar activeTab={activeTab} topics={tabTopics} isLoggedIn={!!currentUser} />

      {/* 빈 화면에서도 남는다. 어느 토픽인지 모르는 채로 "아무것도 없다"만 보이면
          구독을 끊고 나갈 길조차 없다 */}
      {activeTopic && <TopicTabHeader topic={activeTopic} />}

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

          {/* Hot 은 장소가 0곳이어도 지도를 남긴다 — 지금까지의 동작이다.
              토픽 탭은 그 토픽의 장소가 없으면 내린다. 핀도 칩도 없는 지도만 남으면
              "이 토픽은 아직 어디에도 없다"가 아니라 고장으로 읽힌다 */}
          {(isHot || sidoCounts.counts.length > 0) && (
            <KoreaMapCard
              counts={sidoCounts.counts}
              maxCount={sidoCounts.maxCount}
              variant={activeTopic ? "topic" : "brand"}
              accentColor={topicColors?.colorHex ?? "var(--brand)"}
              accentColor2={topicColors?.colorHex2 ?? null}
              accentGradientDir={topicColors?.gradientDir}
              accentGradientStop={topicColors?.gradientStop}
              /* 토픽 탭은 지역 칩을 내지 않는다 — 칩이 가는 discover 는 토픽을 모른다.
                 대신 그 토픽에 몇 곳이 있는지를 제목이 직접 말한다 */
              eyebrow={activeTopic ? `${activeTopic.nameEn} on the map` : undefined}
              title={
                activeTopic
                  ? `${sidoCounts.total} ${sidoCounts.total === 1 ? "spot" : "spots"} across Korea`
                  : undefined
              }
              subtitle={activeTopic ? null : undefined}
              /* 카드에서 넘어간 지도는 같은 토픽만 보여야 한다 —
                 탭에서 좁혀 놓고 들어간 지도가 전국이면 좁힌 것이 풀린다 */
              discoverHref={
                activeTopic ? buildDiscoverHref({ topicSlugs: [activeTopic.slug] }) : undefined
              }
            />
          )}

          {/* 이 섹션만 사용자별이라 캐시가 안 된다. 위의 Promise.all 에 넣으면
              캐시되는 배너·지도까지 이 쿼리를 기다리므로 경계를 따로 세운다 */}
          {isHot && (
            <Suspense fallback={<FollowFeedSkeleton />}>
              <FollowFeedSection />
            </Suspense>
          )}

          {/* 공용 목록이고 단순 orderBy 라 경계를 세우지 않는다 — 페이지와 같이 기다린다.
              topicId 가 없으면 지금까지와 같은 전체 조회다. 토픽 탭에서 그 토픽 것이
              0건이면 섹션이 스스로 null 을 돌려주고 자리를 비운다 */}
          <PopularReCreeshotSection
            topicId={topicId}
            title={activeTopic ? `${activeTopic.nameEn} ReCreeshots` : undefined}
          />

          {isHot && (
            <CuratedSections
              sections={sections}
              sectionData={sectionData}
              tagGroupMap={tagGroupMap}
              savedPostIds={savedPostIds}
              guideVideo={guideVideo}
            />
          )}

          {/* TourAPI 를 타는 유일한 줄이다. 캐시가 비면 최악 12초(4초 × 3페이지)에
              번역 5초가 붙어, 경계가 없으면 홈 첫 바이트가 그만큼 밀린다 */}
          {isHot && (
            <Suspense fallback={<FestivalSkeleton />}>
              <FestivalSection />
            </Suspense>
          )}

          <JourneySection
            topicId={topicId}
            title={activeTopic ? `${activeTopic.nameEn} Journeys` : undefined}
          />
        </>
      )}

      <div className="px-4 mb-4">
        <FeedbackForm source="feed" />
      </div>

      {/* 상한은 Hot 에만 건다. 토픽 탭은 그 토픽의 포스트가 전부여서 끝이 보이고,
          30 에서 끊으면 "더 있는데 안 보여준다"가 된다.

          key 는 탭마다 다르다. 이것이 없으면 탭을 옮겨도 React 가 같은 자리의 같은
          컴포넌트로 보아 무한 피드를 언마운트하지 않고, 목록을 쥔 useState 가
          initialPosts 를 초기값으로만 받기 때문에 앞 탭의 포스트가 그대로 남는다 —
          머리글만 새 토픽으로 바뀌고 아래는 전 토픽인 화면이 된다 */}
      {hasLatest && (
        <FreshDrops
          key={topicId ?? "hot"}
          initialPosts={latestFeedResult.posts}
          initialCursor={latestFeedResult.nextCursor}
          savedPostIds={savedPostIds}
          tagGroupMap={tagGroupMap}
          topicId={topicId}
          title={isHot ? undefined : "All posts"}
          maxItems={isHot ? HOT_TAB_MAX_ITEMS : undefined}
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
