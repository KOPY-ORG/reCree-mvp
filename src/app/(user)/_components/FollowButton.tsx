"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { showError } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { followTopic, unfollowTopic } from "@/app/(user)/_actions/follow-actions";

type FollowButtonProps = {
  topicId: string;
  topicName: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
  variant?: "primary" | "compact";
  /**
   * 구독을 끊기 전에 한 번 되묻는다. 거는 쪽은 묻지 않는다 — 한 번 더 누르면 되돌아간다.
   *
   * 되묻는 자리가 따로 있는 이유는 끊은 값이 그 화면에서 끝나지 않아서다.
   * 홈 탭바에서 끊으면 보고 있던 탭이 사라지고 Hot 으로 떨어진다 (feed-tabs.ts:19).
   * 목록에서 끊는 것처럼 줄 하나가 없어지고 마는 자리에서는 묻지 않는다.
   */
  confirmUnfollow?: boolean;
  onChange?: (following: boolean) => void;
};

export function FollowButton({
  topicId,
  topicName,
  initialFollowing,
  isLoggedIn,
  variant = "primary",
  confirmUnfollow = false,
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      showError(`Sign in to follow ${topicName}`);
      return;
    }

    if (following && confirmUnfollow) {
      setConfirmOpen(true);
      return;
    }

    toggle();
  }

  function toggle() {
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
    <>
      <ConfirmDialog
        open={confirmOpen}
        title={`Unfollow ${topicName}?`}
        description="You can follow it again anytime."
        confirmLabel="Unfollow"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          toggle();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={[
          "inline-flex items-center gap-1.5 font-semibold rounded-full transition-all disabled:opacity-60",
          isCompact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
          "bg-white text-black shadow-sm",
        ].join(" ")}
      >
        {following ? (
          <Heart
            className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}
            fill="#FF5366"
            stroke="#FF5366"
            strokeWidth={2}
          />
        ) : (
          <Heart
            className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
        )}
        {following ? "Following" : "Follow"}
      </button>
    </>
  );
}
