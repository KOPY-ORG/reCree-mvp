"use client";

import { useState, useTransition } from "react";
import { Heart, Check } from "lucide-react";
import { showError } from "@/lib/toast";
import { followTopic, unfollowTopic } from "@/app/(user)/_actions/follow-actions";

type FollowButtonProps = {
  topicId: string;
  topicName: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
  variant?: "primary" | "compact";
  onChange?: (following: boolean) => void;
};

export function FollowButton({
  topicId,
  topicName,
  initialFollowing,
  isLoggedIn,
  variant = "primary",
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      showError(`Sign in to follow ${topicName}`);
      return;
    }

    const previous = following;
    setFollowing(!previous);
    onChange?.(!previous);

    startTransition(async () => {
      const result = previous
        ? await unfollowTopic(topicId)
        : await followTopic(topicId);

      if (result.error === "unauthenticated") {
        setFollowing(previous);
        onChange?.(previous);
        showError("Session expired. Sign in again.");
        return;
      }

      if (result.error) {
        setFollowing(previous);
        onChange?.(previous);
        showError("Something went wrong. Try again.");
      }
    });
  }

  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={[
        "inline-flex items-center gap-1.5 font-semibold rounded-full transition-all disabled:opacity-60",
        isCompact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        following
          ? "bg-muted text-foreground"
          : "bg-brand text-black",
      ].join(" ")}
    >
      {following ? (
        <Check className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.5} />
      ) : (
        <Heart className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
