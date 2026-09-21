import type { PostItem } from "@/lib/post-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { fetchLatestFeed } from "../../_actions/feed-actions";
import { InfiniteFeed } from "../../_components/InfiniteFeed";

/**
 * Hot 탭이 거는 상한. 여기 닿으면 스크롤해도 더 부르지 않는다.
 *
 * 탭마다 다르므로 값을 여기서 쓰지 않고 페이지가 넘긴다 — 어느 탭인지 아는 곳은
 * 페이지뿐이다. 토픽 탭은 넘기지 않아 상한 없이 그 토픽의 포스트를 전부 흘린다.
 */
export const HOT_TAB_MAX_ITEMS = 30;

const TITLE = "Fresh Drops";

/** 최신 장소 포스트 무한 스크롤. 첫 페이지는 서버가 이미 받아 둔 것을 그대로 넘긴다 */
export function FreshDrops({
  initialPosts,
  initialCursor,
  savedPostIds,
  tagGroupMap,
  topicId,
  title = TITLE,
  maxItems,
}: {
  initialPosts: PostItem[];
  initialCursor: string | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  /** 있으면 다음 페이지도 이 토픽으로만 부른다 */
  topicId?: string;
  title?: string;
  /** 주지 않으면 상한 없음 (InfiniteFeed 와 같은 계약) */
  maxItems?: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3 px-4 mt-2">
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
      <div className="px-4">
        <InfiniteFeed
          initialPosts={initialPosts}
          initialCursor={initialCursor}
          savedIds={[...savedPostIds]}
          tagGroupMap={tagGroupMap}
          fetchFn={fetchLatestFeed}
          maxItems={maxItems}
          topicId={topicId}
        />
      </div>
    </>
  );
}
