import Link from "next/link";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostsWithLabels } from "@/lib/post-queries";
import { SavedClient } from "./_components/SavedClient";

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

  const [savedPostIds, savedReCreeshotIds, tagGroupConfigs] = await Promise.all([
    prisma.save
      .findMany({
        where: { userId: currentUser.id, targetType: "POST" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map((r) => r.targetId)),
    prisma.save
      .findMany({
        where: { userId: currentUser.id, targetType: "RECREESHOT" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map((r) => r.targetId)),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  const recreeshots =
    savedReCreeshotIds.length > 0
      ? await prisma.reCreeshot.findMany({
          where: { id: { in: savedReCreeshotIds }, status: { not: "DELETED" } },
          select: { id: true, imageUrl: true, referencePhotoUrl: true, matchScore: true, showBadge: true, status: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const posts =
    savedPostIds.length > 0
      ? await getPostsWithLabels(
          { id: { in: savedPostIds }, status: "PUBLISHED" },
          { take: savedPostIds.length }
        )
      : [];

  return (
    <SavedClient
      posts={posts}
      recreeshots={recreeshots}
      tagGroupConfigs={tagGroupConfigs}
    />
  );
}
