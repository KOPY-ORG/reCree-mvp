"use server";

import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import { getCurrentUser } from "@/lib/auth";
import { getMyFollows } from "@/lib/follow-queries";
import { PUBLIC_PLACE_POST_WHERE } from "@/lib/visibility";

const DEFAULT_TAKE = 10;

export async function fetchLatestFeed({
  cursor,
  take = DEFAULT_TAKE,
  topicId,
}: {
  cursor?: string;
  take?: number;
  /**
   * 있으면 이 토픽이 붙은 포스트만. 하위 토픽까지 펴지 않는다 —
   * 같은 화면의 fetchFollowFeed 와 같은 규칙이다. 한쪽만 하위를 펴면
   * 구독 섹션과 토픽 탭이 같은 토픽을 두고 다른 목록을 보여준다.
   */
  topicId?: string;
} = {}): Promise<{ posts: PostItem[]; nextCursor: string | null }> {
  const posts = await getPostsWithLabels(
    {
      ...PUBLIC_PLACE_POST_WHERE,
      ...(topicId ? { postTopics: { some: { topicId } } } : {}),
    },
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
      ...PUBLIC_PLACE_POST_WHERE,
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
