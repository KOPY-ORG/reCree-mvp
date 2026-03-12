import Link from "next/link";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels, getSavedPostIds } from "@/lib/post-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { PostCard } from "../_components/PostCard";

export default async function SavedPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <LogIn className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Sign in to view saved places</p>
          <p className="text-sm text-muted-foreground">
            Save your favorite posts and access them anytime.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const [savedIds, tagGroupConfigs] = await Promise.all([
    prisma.save.findMany({
      where: { userId: currentUser.id, targetType: "POST" },
      select: { targetId: true },
      orderBy: { createdAt: "desc" },
    }).then((rows) => rows.map((r) => r.targetId)),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  const posts =
    savedIds.length > 0
      ? await getPostsWithLabels(
          { id: { in: savedIds }, status: "PUBLISHED" },
          { take: savedIds.length }
        )
      : [];

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-4">
        <p className="text-lg font-semibold">No saved places yet</p>
        <p className="text-sm text-muted-foreground">
          Tap the bookmark icon on any post to save it here.
        </p>
        <Link
          href="/explore?tab=posts"
          className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
        >
          Explore posts
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-4">Saved</h1>
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            tagGroupMap={tagGroupMap}
            isSaved={true}
            variant="grid"
          />
        ))}
      </div>
    </div>
  );
}
