import { PostCard } from "@/app/(user)/_components/PostCard";
import type { PostItem } from "@/lib/post-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { CARD_GRID } from "@/app/(user)/_components/card-grid";

type PostsGridProps = {
  posts: PostItem[];
  tagGroupMap: TagGroupColorMap;
  savedPostIds: Set<string>;
};

export function PostsGrid({ posts, tagGroupMap, savedPostIds }: PostsGridProps) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No posts yet for this topic.
      </div>
    );
  }

  return (
    <div className={CARD_GRID}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          tagGroupMap={tagGroupMap}
          isSaved={savedPostIds.has(post.id)}
          variant="grid"
        />
      ))}
    </div>
  );
}
