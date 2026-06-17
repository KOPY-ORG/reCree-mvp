"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { togglePostLike } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
}

export function PostActionBar({
  postId,
  initialLiked,
  initialLikeCount,
  commentCount,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleLike() {
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error === "unauthenticated") {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        showToast("Sign in to like");
        return;
      }
      if (result.error) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        showToast("Something went wrong");
        return;
      }
      setLiked(result.liked);
    });
  }

  function handleCommentScroll() {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          className="flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          <Heart
            className="size-5 text-muted-foreground"
            strokeWidth={1.5}
            style={liked ? { fill: "#ef4444", stroke: "#ef4444" } : undefined}
          />
          {likeCount > 0 && (
            <span className="text-sm text-muted-foreground">{likeCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={handleCommentScroll}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="size-5" strokeWidth={1.5} />
          {commentCount > 0 && (
            <span className="text-sm">{commentCount}</span>
          )}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
