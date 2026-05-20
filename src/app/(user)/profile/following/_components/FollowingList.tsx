"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resolveTopicColors, labelBackground } from "@/lib/post-labels";
import { unfollowTopic } from "@/app/(user)/_actions/follow-actions";
import { showError } from "@/lib/toast";
import type { FollowWithTopic } from "@/lib/follow-queries";

type FollowingListProps = {
  initialFollows: FollowWithTopic[];
};

export function FollowingList({ initialFollows }: FollowingListProps) {
  const [follows, setFollows] = useState(initialFollows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleUnfollow(item: FollowWithTopic) {
    const previous = follows;
    setFollows(follows.filter((f) => f.id !== item.id));
    setPendingId(item.id);

    startTransition(async () => {
      const result = await unfollowTopic(item.topic.id);
      setPendingId(null);

      if (result.error) {
        setFollows(previous);
        showError("Couldn't unfollow. Try again.");
      }
    });
  }

  if (follows.length === 0) {
    return (
      <div className="py-16 text-center px-6">
        <p className="text-muted-foreground mb-4">
          You&apos;re not following any topics yet.
        </p>
        <Link
          href="/discover"
          className="inline-block px-4 py-2 bg-brand text-black font-semibold rounded-full text-sm"
        >
          Discover topics
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {follows.map((item) => (
        <FollowRow
          key={item.id}
          item={item}
          isPending={pendingId === item.id}
          onUnfollow={() => handleUnfollow(item)}
        />
      ))}
    </ul>
  );
}

function FollowRow({
  item,
  isPending,
  onUnfollow,
}: {
  item: FollowWithTopic;
  isPending: boolean;
  onUnfollow: () => void;
}) {
  const resolved = resolveTopicColors(item.topic);
  const background = labelBackground({ text: item.topic.nameEn, ...resolved });

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={`/topics/${item.topic.slug}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div
          className="w-12 h-12 rounded-full flex-shrink-0"
          style={{ background }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.topic.nameEn}</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onUnfollow}
        disabled={isPending}
        className="shrink-0 px-3 py-1.5 text-sm font-medium border border-border rounded-full disabled:opacity-50"
      >
        {isPending ? "..." : "Following"}
      </button>
    </li>
  );
}
