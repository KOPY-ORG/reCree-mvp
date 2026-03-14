import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSavedPostIds, type PostItem } from "@/lib/post-queries";
import { getFilteredPosts, getTagGroupsWithTags } from "@/lib/filter-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { ScrapButton } from "../_components/ScrapButton";
import { PostBadges } from "../_components/PostCard";
import { TopicFilterRow } from "./_components/TopicFilterRow";
import { TagFilterRow } from "./_components/TagFilterRow";
import { ExploreTabBar } from "./_components/ExploreTabBar";
import { ExploreSearchActiveBar } from "./_components/ExploreSearchActiveBar";

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
  shots: {
    id: string;
    imageUrl: string;
    matchScore: number | null;
    showBadge: boolean;
  }[];
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
          <div key={shot.id} className="snap-start shrink-0 w-[90px]">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
              <Image
                src={shot.imageUrl}
                alt="recreeshot"
                fill
                className="object-cover"
                sizes="90px"
              />
              {shot.matchScore != null && shot.showBadge && (
                <span className="absolute top-1.5 right-1.5 bg-brand text-black text-[10px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {Math.round(shot.matchScore)}%
                </span>
              )}
            </div>
          </div>
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
  }>;
}) {
  const { tab = "posts", q, topicId, tagId } = await searchParams;
  const topicIds = topicId ? (Array.isArray(topicId) ? topicId : [topicId]) : [];
  const tagIds = tagId ? (Array.isArray(tagId) ? tagId : [tagId]) : [];
  const currentUser = await getCurrentUser();

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
        select: { id: true, imageUrl: true, matchScore: true, showBadge: true },
      }),
      getSavedPostIds(currentUser?.id ?? null),
    ]);

  const tagGroupMap: TagGroupColorMap = new Map(
    tagGroupConfigs.map((c) => [c.group, c])
  );

  const posts =
    tab === "posts" ? await getFilteredPosts({ q, topicIds, tagIds }) : [];

  const hasFilter = !!(q || topicIds.length || tagIds.length);

  return (
    <div className="max-w-2xl mx-auto">

      {/* 검색어 활성 바 */}
      {q && <ExploreSearchActiveBar q={q} />}

      {/* 필터 Row 1: Topic Level 0 */}
      <TopicFilterRow topics={level0Topics} />

      {/* 필터 Row 2: TagGroup */}
      <TagFilterRow tagGroups={tagGroups} />

      {/* 탭 바 (sticky top-14 = AppHeader 높이) */}
      <ExploreTabBar />

      {/* Posts 탭 */}
      {tab === "posts" && (
        <div className="px-4">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              {hasFilter ? "No posts found." : "아직 포스트가 없습니다."}
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
          {recreeshots.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              아직 리크리샷이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {recreeshots.map((shot) => (
                <div
                  key={shot.id}
                  className="relative aspect-3/4 rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={shot.imageUrl}
                    alt="recreeshot"
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 50vw, 336px"
                  />
                  {shot.matchScore != null && shot.showBadge && (
                    <span className="absolute top-2 right-2 bg-brand text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {Math.round(shot.matchScore)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
