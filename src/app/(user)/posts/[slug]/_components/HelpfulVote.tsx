"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { toggleHelpfulVote } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  postId: string;
  initialVoted: boolean;
  initialCount: number;
}

// 게시글 맨 아래 "도움이 됐어요". 로그인 없이 누르고, 같은 기기에서 다시 누르면 취소된다.
// 좋아요(하트)와는 별개다. 눌린 상태는 엄지 버튼을 reCree 라임으로 채운다 (라임 위는 검정).
// 숫자는 먼저 바꿔 보여주고(서버 응답을 기다리지 않는다) 실패하면 되돌린다
export function HelpfulVote({ postId, initialVoted, initialCount }: Props) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleClick() {
    const prev = { voted, count };
    const next = { voted: !voted, count: Math.max(0, count + (voted ? -1 : 1)) };
    setVoted(next.voted);
    setCount(next.count);

    startTransition(async () => {
      const result = await toggleHelpfulVote(postId);
      if (result.error) {
        setVoted(prev.voted);
        setCount(prev.count);
        showToast(result.error === "rate_limited" ? "Too many tries. Please wait a moment." : "Something went wrong");
        return;
      }
      // 다른 사람의 투표가 그사이 더해졌을 수 있어 서버 숫자로 맞춘다
      setVoted(result.voted);
      setCount(result.count);
    });
  }

  return (
    <>
      {/* 카드가 아니라 버튼으로 보이게 — 그림자 없이 윤곽선만 있는 알약, 통째로 누른다(press-scale).
          눌린 상태는 라임으로 채우고 윤곽선도 라임 (라임 위 글자 · 아이콘은 검정). 숫자는 알약 아래 */}
      <div className="mx-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-pressed={voted}
          className={`press-scale flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${
            voted
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border bg-background text-foreground"
          }`}
        >
          <ThumbsUp
            className="size-5"
            strokeWidth={1.75}
            fill={voted ? "currentColor" : "none"}
            aria-hidden="true"
          />
          Was this helpful?
        </button>
        {count > 0 && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {count} {count === 1 ? "fan" : "fans"} found this helpful
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
