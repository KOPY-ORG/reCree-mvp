"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { togglePostLike } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { LoginPromptDialog } from "@/app/(user)/_components/LoginPromptDialog";
import { SwapLabel } from "@/app/(user)/_components/SwapLabel";
import { VOTE_PILL, VOTE_PILL_IDLE, VOTE_PILL_ON } from "./HelpfulVote";

interface Props {
  postId: string;
  initialLiked: boolean;
  isSaved: boolean;
  isLoggedIn: boolean;
}

// 게시글 아래 좋아요 · 저장. "Was this helpful?"(HelpfulVote) 앞, 같은 줄에 놓이는 같은 알약 —
// 윤곽선 알약, 눌리면 흰 바탕에 윤곽선이 아이콘과 같은 색. 아이콘 색 — 좋아요 빨강, 저장 라임(다른 저장 버튼과 같은 색).
// 둘 다 로그인해야 누를 수 있다. 비로그인은 상태를 바꾸지 않고 로그인 안내창을 띄운다.
// 저장은 사진 위 · 칩 줄 저장 버튼과 상태가 함께 바뀐다 (ScrapButton 의 scrap-change 이벤트)
export function LikeSaveButtons({ postId, initialLiked, isSaved, isLoggedIn }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleLike() {
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }

    const prevLiked = liked;
    setLiked(!prevLiked);

    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error) {
        setLiked(prevLiked);
        showToast(result.error === "unauthenticated" ? "Sign in to like" : "Something went wrong");
        return;
      }
      setLiked(result.liked);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLike}
        disabled={pending}
        aria-pressed={liked}
        className={`${VOTE_PILL} ${liked ? `${VOTE_PILL_ON} border-red-500` : VOTE_PILL_IDLE}`}
      >
        <Heart
          className="size-5"
          strokeWidth={1.75}
          style={liked ? { fill: "var(--color-red-500)", stroke: "var(--color-red-500)" } : undefined}
          aria-hidden="true"
        />
        <SwapLabel on={liked} onText="Liked" offText="Like" />
      </button>

      <ScrapButton
        postId={postId}
        initialSaved={isSaved}
        isLoggedIn={isLoggedIn}
        className={VOTE_PILL}
        stateClassName={{ saved: `${VOTE_PILL_ON} border-brand`, unsaved: VOTE_PILL_IDLE }}
        unsavedClassName=""
        strokeWidth={1.75}
        label={{ saved: "Saved", unsaved: "Save" }}
      />

      <LoginPromptDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        title="Sign in to like"
        description="Show some love for the spots you enjoy."
      />

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
