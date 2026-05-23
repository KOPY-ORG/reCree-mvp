import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { prisma } from "@/lib/prisma";
import { getSavedPostIds, type PostItem } from "@/lib/post-queries";
import { getFilteredPosts, getTagGroupsWithTags } from "@/lib/filter-queries";
import { getAllMapPlaces, getFilteredMapPlaces, type MapPlace } from "@/lib/map-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { topicIdSchema } from "@/lib/validators/follow";
import { getCuratedSections, getSectionData, getPostMoreHref, type SectionData } from "@/lib/curation-queries";
import { ScrapButton } from "../_components/ScrapButton";
import { PostBadges, PostCard } from "../_components/PostCard";
import { GuideVideoCard } from "../_components/GuideVideoCard";
import { TopicFilterRow } from "./_components/TopicFilterRow";
import { TagFilterRow } from "./_components/TagFilterRow";
import { ExploreSearchActiveBar } from "./_components/ExploreSearchActiveBar";
import { ExploreMapView } from "./_components/ExploreMapView";
import { ViewToggleButton } from "./_components/ViewToggleButton";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { ReCreeshotImage } from "@/components/recreeshot-image";

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function PostListItem({
  post,
  tagGroupMap,
  isSaved,
  priority = false,
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
    >
      <div className="relative size-[88px] shrink-0 rounded-lg overflow-hidden bg-muted">
        {post.postImages[0]?.url ? (
          <Image
            src={post.postImages[0].url}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(post.postImages[0].url)}
            className="object-cover"
            style={focalStyle(post.postImages[0].focalX, post.postImages[0].focalY, post.postImages[0].zoom)}
            sizes="88px"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base line-clamp-2 leading-snug">
          {post.postPlaces[0]?.place.nameEn ??
            post.postPlaces[0]?.place.nameKo ??
            post.titleEn}
        </p>
        {post.postPlaces[0] && (
          <p className="text-[10px] font-normal text-muted-foreground line-clamp-2 leading-snug mt-0.5">
            {post.titleEn}
          </p>
        )}
        <div className="mt-1.5">
          <PostBadges post={post} tagGroupMap={tagGroupMap} variant="list" />
        </div>
      </div>

      <ScrapButton postId={post.id} initialSaved={isSaved} size="md" />
    </Link>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    topicId?: string | string[];
    tagId?: string | string[];
    tagGroup?: string;
    view?: string;
  }>;
}) {
  const { q, topicId, tagId, tagGroup, view } = await searchParams;
  const isMapView = view === "map";
  const isUUID = (v: string) => topicIdSchema.safeParse(v).success;
  const topicIds = (topicId ? (Array.isArray(topicId) ? topicId : [topicId]) : []).filter(isUUID);
  const tagIds = (tagId ? (Array.isArray(tagId) ? tagId : [tagId]) : []).filter(isUUID);

  // 세 모드가 상호 배타적으로 구분됨
  const hasFilters = !!(q || topicIds.length > 0 || tagIds.length > 0 || tagGroup);
  const isFilterMode = !isMapView && hasFilters;
  const isCurationMode = !isMapView && !hasFilters;

  const currentUser = await getCurrentUser();

  const [level0Topics, tagGroups, tagGroupConfigs, savedPostIds, allPlaces, posts] =
    await Promise.all([
      getLevel0TopicsDeep(),
      getTagGroupsWithTags(),
      prisma.tagGroupConfig.findMany({
        select: {
          group: true,
          displayLabel: true,
          colorHex: true,
          colorHex2: true,
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
        },
      }),
      getSavedPostIds(currentUser?.id ?? null),
      isMapView
        ? (hasFilters
            ? getFilteredMapPlaces({ q, topicIds, tagIds, tagGroupName: tagGroup })
            : getAllMapPlaces())
        : Promise.resolve(null as MapPlace[] | null),
      // 필터 모드에서만 포스트 조회 (큐레이션 모드에선 불필요)
      isFilterMode ? getFilteredPosts({ q, topicIds, tagIds, tagGroupName: tagGroup }) : Promise.resolve(null),
    ]);

  const tagGroupMap: TagGroupColorMap = new Map(
    tagGroupConfigs.map((c) => [c.group, c])
  );

  // ─── 지도 뷰 ─────────────────────────────────────────────────────────────────
  if (isMapView && allPlaces) {
    const placesWithSaved = allPlaces.map((place) => ({
      ...place,
      isSaved: place.posts.some((p) => savedPostIds.has(p.id)),
    }));
    return (
      <>
        <ExploreMapView
          allPlaces={placesWithSaved}
          savedPostIds={[...savedPostIds]}
          tagGroupConfigs={tagGroupConfigs}
          isLoggedIn={!!currentUser}
        />
        <ViewToggleButton />
      </>
    );
  }

  // ─── 큐레이션 데이터 (필터 없음 모드에서만 조회) ──────────────────────────────
  let curSections: Awaited<ReturnType<typeof getCuratedSections>> = [];
  let curSectionData: SectionData[] = [];
  let guideVideo: Awaited<ReturnType<typeof prisma.guideVideo.findFirst>> = null;

  if (isCurationMode) {
    const [rawSections, gv] = await Promise.all([
      getCuratedSections({}),
      prisma.guideVideo.findFirst({ where: { isActive: true } }),
    ]);
    curSections = rawSections;
    guideVideo = gv;
    curSectionData = await getSectionData(curSections);
  }

  // ─── 리스트 / 큐레이션 뷰 ────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-2xl mx-auto pb-14">

        {/* 필터 영역 — 항상 표시. 칩 선택 시 isFilterMode로 자연스럽게 전환 */}
        <div className="border-b border-border/50">
          {q && <ExploreSearchActiveBar q={q} />}
          <TopicFilterRow topics={level0Topics} />
          <TagFilterRow tagGroups={tagGroups} />
        </div>

        {/* 큐레이션 모드: 가로 스크롤 섹션 행들 */}
        {isCurationMode && (
          <div className="pt-2">
            {curSections.map((section, i) => {
              const data = curSectionData[i];
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
                <HScrollSection key={section.id} title={section.titleEn} moreHref={getPostMoreHref(section)}>
                  {data.items.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      tagGroupMap={tagGroupMap}
                      isSaved={savedPostIds.has(post.id)}
                      priority={index === 0}
                    />
                  ))}
                </HScrollSection>
              );
            })}

            {/* 모든 섹션이 비었거나 섹션 자체가 0개일 때 */}
            {(curSections.length === 0 || curSectionData.every((d) => d.items.length === 0)) && (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                Coming soon!
              </div>
            )}
          </div>
        )}

        {/* 필터 모드: 기존 가로형 리스트 */}
        {isFilterMode && (
          <div className="px-4">
            {(posts ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                Coming soon!
              </div>
            ) : (
              (posts ?? []).map((post, index) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  tagGroupMap={tagGroupMap}
                  isSaved={savedPostIds.has(post.id)}
                  priority={index === 0}
                />
              ))
            )}
          </div>
        )}
      </div>
      <ViewToggleButton />
    </>
  );
}
