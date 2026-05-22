"use server";

import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import { getCurrentUser } from "@/lib/auth";
import { getMyFollows } from "@/lib/follow-queries";

const DEFAULT_TAKE = 10;

export async function fetchLatestFeed({
  cursor,
  take = DEFAULT_TAKE,
}: {
  cursor?: string;
  take?: number;
} = {}): Promise<{ posts: PostItem[]; nextCursor: string | null }> {
  const posts = await getPostsWithLabels(
    { status: "PUBLISHED" },
    {
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor,
    }
  );
  const nextCursor = posts.length === take ? posts[posts.length - 1].id : null;
  return { posts, nextCursor };
}

export async function fetchFollowFeed({
  cursor,
}: {
  cursor?: string;
} = {}): Promise<{ posts: PostItem[]; nextCursor: string | null }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { posts: [], nextCursor: null };

  const follows = await getMyFollows(currentUser.id);
  const topicIds = follows.map((f) => f.topic.id);
  if (topicIds.length === 0) return { posts: [], nextCursor: null };

  const posts = await getPostsWithLabels(
    {
      status: "PUBLISHED",
      postTopics: { some: { topicId: { in: topicIds } } },
    },
    {
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor,
    }
  );

  const nextCursor = posts.length === 10 ? posts[posts.length - 1].id : null;
  return { posts, nextCursor };
}
