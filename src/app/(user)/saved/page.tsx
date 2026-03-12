import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels, type PostItem } from "@/lib/post-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { PostBadges } from "../_components/PostCard";
import { ScrapButton } from "../_components/ScrapButton";

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

  const [savedRows, tagGroupConfigs] = await Promise.all([
    prisma.save.findMany({
      where: { userId: currentUser.id, targetType: "POST" },
      select: { targetId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  const savedPostIds = savedRows.map((r) => r.targetId);

  const posts: PostItem[] =
    savedPostIds.length > 0
      ? await getPostsWithLabels(
          { id: { in: savedPostIds }, status: "PUBLISHED" },
          { take: savedPostIds.length }
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
          <Link key={post.id} href={`/posts/${post.slug}`}>
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-muted">
              {post.postImages[0]?.url ? (
                <Image
                  src={post.postImages[0].url}
                  alt={post.titleEn}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 672px) 50vw, 336px"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 right-2">
                <PostBadges post={post} tagGroupMap={tagGroupMap} />
              </div>
              <div className="absolute bottom-2 left-2 right-10">
                <p className="text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
                  {post.titleEn}
                </p>
              </div>
              <div className="absolute bottom-2 right-2 z-10">
                <ScrapButton postId={post.id} initialSaved={true} size="sm" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
