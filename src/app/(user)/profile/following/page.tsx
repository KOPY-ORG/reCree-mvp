import Link from "next/link";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getMyFollows } from "@/lib/follow-queries";
import { FollowingList } from "./_components/FollowingList";

export const metadata: Metadata = {
  title: "Following | reCree",
};

export default async function FollowingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Sign in to see your following topics</p>
          <p className="text-sm text-muted-foreground">
            Follow topics to get curated K-spots in your feed.
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

  const follows = await getMyFollows(currentUser.id);

  return (
    <div className="max-w-2xl mx-auto pb-14">
      <header className="px-4 py-4 border-b border-border/50 sticky top-12 bg-background z-10">
        <h1 className="text-xl font-semibold">Following</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {follows.length} {follows.length === 1 ? "topic" : "topics"}
        </p>
      </header>
      <FollowingList initialFollows={follows} />
    </div>
  );
}
