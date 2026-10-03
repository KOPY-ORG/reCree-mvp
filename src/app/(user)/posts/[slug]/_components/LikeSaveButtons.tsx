"use client";

import { Heart } from "lucide-react";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { SwapLabel } from "@/app/(user)/_components/SwapLabel";
import { VOTE_PILL, VOTE_PILL_IDLE, VOTE_PILL_ON } from "./HelpfulVote";
import { usePostLike } from "./PostLikeProvider";

interface Props {
  postId: string;
  isSaved: boolean;
  isLoggedIn: boolean;
}

// 게시글 아래 좋아요 · 저장. "Was this helpful?"(HelpfulVote) 앞, 같은 줄에 놓이는 같은 알약 —
// 윤곽선 알약, 눌리면 흰 바탕에 윤곽선이 아이콘과 같은 색. 아이콘 색 — 좋아요 빨강, 저장 라임(다른 저장 버튼과 같은 색).
// 둘 다 로그인해야 누를 수 있다. 좋아요 상태 · 로그인 안내창은 PostLikeProvider 가 들고 있다 (lg 제목 아래 하트와 공유).
// 저장은 사진 위 · 칩 줄 저장 버튼과 상태가 함께 바뀐다 (ScrapButton 의 scrap-change 이벤트)
export function LikeSaveButtons({ postId, isSaved, isLoggedIn }: Props) {
  const { liked, pending, toggle } = usePostLike();

  return (
    <>
      <button
        type="button"
        onClick={toggle}
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
    </>
  );
}
