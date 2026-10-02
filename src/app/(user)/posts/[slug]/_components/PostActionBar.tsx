"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { togglePostLike } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";

interface Props {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
  isSaved: boolean;
  /** 저장 버튼 글자. 장소 글은 "Save this place", 그 밖은 "Save" */
  saveLabel: string;
}

export function PostActionBar({
  postId,
  initialLiked,
  initialLikeCount,
  commentCount,
  isSaved,
  saveLabel,
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
      <div className="flex items-center justify-between gap-4 px-4 py-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className="flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          <Heart
            aria-hidden="true"
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
          aria-label="Go to comments"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="size-5" strokeWidth={1.5} aria-hidden="true" />
          {commentCount > 0 && (
            <span className="text-sm">{commentCount}</span>
          )}
        </button>
      </div>

        {/* 저장 — 아이콘만으로는 무엇을 하는지 덜 분명해 글자를 붙인 알약. 사진 위 저장 버튼과 상태가 함께 바뀐다.
            저장되면 북마크를 라임으로 채우고 검정 테두리 (회색 면 위 라임은 테두리가 있어야 보인다) */}
        <ScrapButton
          postId={postId}
          initialSaved={isSaved}
          size="sm"
          label={{ saved: "Saved", unsaved: saveLabel }}
          className="press-scale flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 text-sm font-medium text-foreground disabled:opacity-60"
          unsavedClassName="text-foreground"
          strokeWidth={2}
          savedStyle={{ fill: "var(--brand)", stroke: "var(--foreground)" }}
        />
      </div>

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
