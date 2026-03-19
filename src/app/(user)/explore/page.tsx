import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSavedPostIds, type PostItem } from "@/lib/post-queries";
import { getFilteredPosts, getTagGroupsWithTags } from "@/lib/filter-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { type TagGroupColorMap, resolveTopicColors, resolveTagColors, labelBackground } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { ScrapButton } from "../_components/ScrapButton";
import { PostBadges } from "../_components/PostCard";
import { TopicFilterRow } from "./_components/TopicFilterRow";
import { TagFilterRow } from "./_components/TagFilterRow";
import { ExploreTabBar } from "./_components/ExploreTabBar";
import { ExploreSearchActiveBar } from "./_components/ExploreSearchActiveBar";
import { HallGrid } from "./_components/HallGrid";
import { ReCreeshotImage } from "@/components/recreeshot-image";

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function PostListItem({
  post,
  tagGroupMap,
  isSaved,
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved: boolean;
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
            unoptimized
            className="object-cover"
            sizes="88px"
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

function RecreeshotInlineSection({
  shots,
}: {
  shots: { id: string; imageUrl: string; matchScore: number | null; showBadge: boolean; referencePhotoUrl: string | null }[];
}) {
  if (shots.length === 0) return null;
  return (
    <div className="py-4 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-sm">See How They reCreated</p>
        <Link
          href="/explore?tab=hall"
          className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
        >
          more <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {shots.map((shot) => (
          <Link key={shot.id} href={`/explore/hall/${shot.id}`} className="snap-start shrink-0 w-[90px] block">
            <ReCreeshotImage
              shotUrl={shot.imageUrl}
              referenceUrl={shot.referencePhotoUrl}
              matchScore={shot.matchScore}
              showBadge={shot.showBadge}
              referencePosition="top-left"
              badgePosition="top-right"
              variant="thumb-sm"
              className="aspect-[4/5]"
              sizes="90px"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    topicId?: string | string[];
    tagId?: string | string[];
    tagGroup?: string;
  }>;
}) {
  const { tab = "posts", q, topicId, tagId, tagGroup } = await searchParams;
  const topicIds = topicId ? (Array.isArray(topicId) ? topicId : [topicId]) : [];
  const tagIds = tagId ? (Array.isArray(tagId) ? tagId : [tagId]) : [];
  const currentUser = await getCurrentUser();

  const guideVideo = await prisma.guideVideo.findFirst({ where: { isActive: true } });

  const [level0Topics, tagGroups, tagGroupConfigs, recreeshots, savedPostIds] =
    await Promise.all([
      getLevel0TopicsDeep(),
      getTagGroupsWithTags(),
      prisma.tagGroupConfig.findMany({
        select: {
          group: true,
          colorHex: true,
          colorHex2: true,
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
        },
      }),
      prisma.reCreeshot.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          imageUrl: true,
          matchScore: true,
          showBadge: true,
          referencePhotoUrl: true,
          reCreeshotTopics: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              topic: {
                select: {
                  nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
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
          reCreeshotTags: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { tag: { select: { name: true, group: true, colorHex: true, colorHex2: true, textColorHex: true } } },
          },
        },
      }),
      getSavedPostIds(currentUser?.id ?? null),
    ]);

  const tagGroupMap: TagGroupColorMap = new Map(
    tagGroupConfigs.map((c) => [c.group, c])
  );

  const posts =
    tab === "posts" ? await getFilteredPosts({ q, topicIds, tagIds, tagGroupName: tagGroup }) : [];

  const hasFilter = !!(q || topicIds.length || tagIds.length || tagGroup);

  const hallShots = recreeshots.map((shot) => {
    const topicLabels = shot.reCreeshotTopics.map((t) => {
      const resolved = resolveTopicColors(t.topic);
      return { text: t.topic.nameEn, background: labelBackground({ text: t.topic.nameEn, ...resolved }), color: resolved.textColorHex };
    });
    const tagLabels = shot.reCreeshotTags.map((t) => {
      const resolved = resolveTagColors(t.tag, tagGroupMap.get(t.tag.group));
      return { text: t.tag.name, background: labelBackground({ text: t.tag.name, ...resolved }), color: resolved.textColorHex };
    });
    const labels = [...topicLabels, ...tagLabels].slice(0, 2);
    return { id: shot.id, imageUrl: shot.imageUrl, matchScore: shot.matchScore, showBadge: shot.showBadge, referencePhotoUrl: shot.referencePhotoUrl, labels };
  });

  return (
    <div className="max-w-2xl mx-auto pb-14">

      {/* 필터 영역 (Posts 탭에서만) */}
      {tab !== "hall" && (
        <div className="border-b border-border/50">
          {q && <ExploreSearchActiveBar q={q} />}
          <TopicFilterRow topics={level0Topics} />
          <TagFilterRow tagGroups={tagGroups} />
        </div>
      )}

      {/* 탭 바 (sticky top-14 = AppHeader 높이) */}
      <ExploreTabBar isLoggedIn={!!currentUser} />

      {/* Posts 탭 */}
      {tab === "posts" && (
        <div className="px-4">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Coming soon!
            </div>
          ) : hasFilter ? (
            posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                tagGroupMap={tagGroupMap}
                isSaved={savedPostIds.has(post.id)}
              />
            ))
          ) : (
            <>
              {posts.slice(0, 3).map((post) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  tagGroupMap={tagGroupMap}
                  isSaved={savedPostIds.has(post.id)}
                />
              ))}

              {recreeshots.length > 0 && (
                <RecreeshotInlineSection shots={recreeshots.slice(0, 6)} />
              )}

              {posts.slice(3).map((post) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  tagGroupMap={tagGroupMap}
                  isSaved={savedPostIds.has(post.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Hall 탭 */}
      {tab === "hall" && (
        <div className="px-4 py-4">
          <HallGrid shots={hallShots} guideVideo={guideVideo} />
        </div>
      )}
    </div>
  );
}
