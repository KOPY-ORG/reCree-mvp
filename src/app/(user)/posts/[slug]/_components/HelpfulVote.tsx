"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { toggleHelpfulVote } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import { SwapLabel } from "@/app/(user)/_components/SwapLabel";

interface Props {
  postId: string;
  initialVoted: boolean;
  /** 같은 줄에서 이 버튼 앞에 놓을 버튼들 (상세의 좋아요 · 저장) */
  children?: React.ReactNode;
}

/**
 * 알약 모양 — 좋아요 · 저장(LikeSaveButtons)도 같이 쓴다.
 * 윤곽선은 늘 있고, 눌리면 바탕이 흰색, 윤곽선이 아이콘과 같은 색이 된다 (색은 버튼마다 붙인다).
 * 글자는 SwapLabel 로 바꿔 눌러도 폭이 변하지 않는다
 */
export const VOTE_PILL = "press-scale flex h-12 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold text-foreground transition-colors disabled:opacity-60";
export const VOTE_PILL_IDLE = "border-border bg-background";
export const VOTE_PILL_ON = "bg-white";

// 게시글 맨 아래 "도움이 됐어요". 로그인 없이 누르고, 같은 기기에서 다시 누르면 취소된다.
// 좋아요(하트)와는 별개다. 눌린 상태는 엄지를 파란색으로 채우고 글자가 Thanks! 로 바뀐다.
// 먼저 바꿔 보여주고(서버 응답을 기다리지 않는다) 실패하면 되돌린다
export function HelpfulVote({ postId, initialVoted, children }: Props) {
  const [voted, setVoted] = useState(initialVoted);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleClick() {
    const prevVoted = voted;
    setVoted(!prevVoted);

    startTransition(async () => {
      const result = await toggleHelpfulVote(postId);
      if (result.error) {
        setVoted(prevVoted);
        showToast(result.error === "rate_limited" ? "Too many tries. Please wait a moment." : "Something went wrong");
        return;
      }
      setVoted(result.voted);
    });
  }

  return (
    <>
      <div className="mx-4 flex items-center justify-center gap-2">
        {children}
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-pressed={voted}
          className={`${VOTE_PILL} ${voted ? `${VOTE_PILL_ON} border-blue-500` : VOTE_PILL_IDLE}`}
        >
          <ThumbsUp
            className="size-5"
            strokeWidth={1.75}
            style={voted ? { fill: "var(--color-blue-500)", stroke: "var(--color-blue-500)" } : undefined}
            aria-hidden="true"
          />
          <SwapLabel on={voted} onText="Thanks!" offText="Helpful?" />
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
