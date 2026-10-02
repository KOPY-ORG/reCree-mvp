"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { togglePostLike } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";

interface Props {
  postId: string;
  initialLiked: boolean;
  isSaved: boolean;
}

/** 세 버튼 공통 — 누르는 칸 44, 아이콘만. 누르면 살짝 줄어든다 */
const ACTION = "press-scale flex size-11 items-center justify-center rounded-full transition-colors";
/** 아이콘 24, 선은 칩 옆에서도 묻히지 않게 진한 회색(gray-900) · 1.75 */
const ICON = "size-6";
const STROKE = 1.75;

export function PostActionBar({
  postId,
  initialLiked,
  isSaved,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleLike() {
    const prevLiked = liked;
    setLiked(!prevLiked);

    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error === "unauthenticated") {
        setLiked(prevLiked);
        showToast("Sign in to like");
        return;
      }
      if (result.error) {
        setLiked(prevLiked);
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
      {/* 토픽 칩 줄의 오른쪽 끝에 붙는다 (PostMetaBar). 좋아요 → 댓글 → 저장, 아이콘만.
          누르는 칸(44)이 칩(약 21)보다 커서 위아래로 넘치게 두어 칩 줄 높이를 늘리지 않는다.
          마지막 칸의 여백만큼 오른쪽으로 밀어 북마크가 본문 오른쪽 끝에 맞는다 */}
      <div className="-my-2.5 -mr-2.5 flex shrink-0 items-center">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className={`${ACTION} text-gray-900 disabled:opacity-60`}
        >
          <Heart
            aria-hidden="true"
            className={ICON}
            strokeWidth={STROKE}
            style={liked ? { fill: "#ef4444", stroke: "#ef4444" } : undefined}
          />
        </button>

        <button
          type="button"
          onClick={handleCommentScroll}
          aria-label="Go to comments"
          className={`${ACTION} text-gray-900`}
        >
          <MessageCircle className={ICON} strokeWidth={STROKE} aria-hidden="true" />
        </button>

        {/* 저장되면 북마크를 라임으로 채운다 (윤곽선도 라임 — ScrapButton 기본 savedStyle). 사진 위 저장 버튼과 상태가 함께 바뀐다 */}
        <ScrapButton
          postId={postId}
          initialSaved={isSaved}
          size="lg"
          className={`${ACTION} disabled:opacity-60`}
          unsavedClassName="text-gray-900"
          strokeWidth={STROKE}
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
