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
}

/** 세 버튼 공통 — 누르는 칸 44, 숫자가 붙으면 옆으로 늘어난다. 누르면 살짝 줄어든다 */
const ACTION = "press-scale flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors";
const ICON = "size-6";

export function PostActionBar({
  postId,
  initialLiked,
  initialLikeCount,
  commentCount,
  isSaved,
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
      {/* 좋아요 → 댓글 → 저장, 아이콘만 오른쪽 정렬. 아이콘 24 · 누르는 칸 44(좌우 10 여백).
          마지막 칸의 여백만큼 줄을 오른쪽으로 밀어 북마크 아이콘이 본문 오른쪽 끝(px-4)에 맞는다 */}
      <div className="flex items-center justify-end gap-1 px-4 py-1 -mr-2.5">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className={`${ACTION} text-muted-foreground disabled:opacity-60`}
        >
          <Heart
            aria-hidden="true"
            className={ICON}
            strokeWidth={1.5}
            style={liked ? { fill: "#ef4444", stroke: "#ef4444" } : undefined}
          />
          {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
        </button>

        <button
          type="button"
          onClick={handleCommentScroll}
          aria-label="Go to comments"
          className={`${ACTION} text-muted-foreground hover:text-foreground`}
        >
          <MessageCircle className={ICON} strokeWidth={1.5} aria-hidden="true" />
          {commentCount > 0 && <span className="text-sm">{commentCount}</span>}
        </button>

        {/* 저장되면 북마크를 라임으로 채운다 (윤곽선도 라임 — ScrapButton 기본 savedStyle). 사진 위 저장 버튼과 상태가 함께 바뀐다 */}
        <ScrapButton
          postId={postId}
          initialSaved={isSaved}
          size="lg"
          className={`${ACTION} disabled:opacity-60`}
          unsavedClassName="text-muted-foreground"
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
