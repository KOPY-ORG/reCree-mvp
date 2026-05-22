"use server";

import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";

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
