import type { PostItem } from "@/lib/post-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { fetchLatestFeed } from "../../_actions/feed-actions";
import { InfiniteFeed } from "../../_components/InfiniteFeed";

/** 최신 장소 포스트 무한 스크롤. 첫 페이지는 서버가 이미 받아 둔 것을 그대로 넘긴다 */
export function FreshDrops({
  initialPosts,
  initialCursor,
  savedPostIds,
  tagGroupMap,
}: {
  initialPosts: PostItem[];
  initialCursor: string | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3 px-4 mt-2">
        <h2 className="font-bold text-lg">Fresh Drops</h2>
      </div>
      <div className="px-4">
        <InfiniteFeed
          initialPosts={initialPosts}
          initialCursor={initialCursor}
          savedIds={[...savedPostIds]}
          tagGroupMap={tagGroupMap}
          fetchFn={fetchLatestFeed}
        />
      </div>
    </>
  );
}
