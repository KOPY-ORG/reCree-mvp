import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { prisma } from "@/lib/prisma";
import { getSavedPostIds, type PostItem } from "@/lib/post-queries";
import { getFilteredPosts, getTagGroupsWithTags } from "@/lib/filter-queries";
import { getAllMapPlaces, type MapPlace } from "@/lib/map-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { topicIdSchema } from "@/lib/validators/follow";
import { ScrapButton } from "../_components/ScrapButton";
import { PostBadges } from "../_components/PostCard";
import { TopicFilterRow } from "./_components/TopicFilterRow";
import { TagFilterRow } from "./_components/TagFilterRow";
import { ExploreSearchActiveBar } from "./_components/ExploreSearchActiveBar";
import { ExploreMapView } from "./_components/ExploreMapView";
import { ViewToggleButton } from "./_components/ViewToggleButton";

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
            unoptimized={isExternalImage(post.postImages[0].url)}
            className="object-cover"
            style={focalStyle(post.postImages[0].focalX, post.postImages[0].focalY, post.postImages[0].zoom)}
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
      isMapView ? getAllMapPlaces() : Promise.resolve(null as MapPlace[] | null),
      isMapView ? Promise.resolve(null) : getFilteredPosts({ q, topicIds, tagIds, tagGroupName: tagGroup }),
    ]);

  const tagGroupMap: TagGroupColorMap = new Map(
    tagGroupConfigs.map((c) => [c.group, c])
  );

  if (isMapView && allPlaces) {
    return (
      <>
        <ExploreMapView
          allPlaces={allPlaces}
          savedPostIds={[...savedPostIds]}
          tagGroupConfigs={tagGroupConfigs}
        />
        <ViewToggleButton />
      </>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto pb-14">

        {/* 필터 영역 */}
        <div className="border-b border-border/50">
          {q && <ExploreSearchActiveBar q={q} />}
          <TopicFilterRow topics={level0Topics} />
          <TagFilterRow tagGroups={tagGroups} />
        </div>

        {/* Posts */}
        <div className="px-4">
          {(posts ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Coming soon!
            </div>
          ) : (
            (posts ?? []).map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                tagGroupMap={tagGroupMap}
                isSaved={savedPostIds.has(post.id)}
              />
            ))
          )}
        </div>
      </div>
      <ViewToggleButton />
    </>
  );
}
