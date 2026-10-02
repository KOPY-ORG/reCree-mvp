"use client";

import { useState } from "react";
import { Flag, Heart, MessageCircle, MoreVertical, Share2 } from "lucide-react";
import { showError } from "@/lib/toast";
import { ReportDialog } from "@/components/ReportDialog";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { usePostLike } from "./PostLikeProvider";
import { useSharePost } from "./useSharePost";

interface Props {
  postId: string;
  isSaved: boolean;
  isLoggedIn: boolean;
  titleEn: string;
}

/** 버튼 공통 — 누르는 칸 44(lg 42), 아이콘만. 누르면 살짝 줄어든다 */
const ACTION = "press-scale flex size-11 items-center justify-center rounded-full transition-colors lg:size-[42px]";
/** lg 에서만 보이는 버튼 — 좋아요 · 공유 · 더보기. 모바일은 아래 좋아요 줄과 사진 위 버튼이 맡는다 */
const LG_ONLY = "hidden lg:flex";
/** 아이콘 24, 선은 칩 옆에서도 묻히지 않게 진한 회색(gray-900) · 1.75 */
const ICON = "size-6";
const STROKE = 1.75;

// 모바일: 토픽 칩 줄의 오른쪽 끝 — 댓글 → 저장 (좋아요는 게시글 아래 LikeSaveButtons).
// lg: 제목 아래 한 줄 — 좋아요 → 댓글 → 저장 → 공유 → 더보기. 사진 위 버튼(PostDetailHeader)은 lg 에서 숨는다.
// 좋아요는 PostLikeProvider, 저장은 ScrapButton 의 scrap-change 이벤트로 다른 버튼과 상태가 함께 바뀐다
export function PostActionBar({ postId, isSaved, isLoggedIn, titleEn }: Props) {
  const { liked, pending, toggle } = usePostLike();
  const { share, toast } = useSharePost(titleEn);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  function handleCommentScroll() {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    // 누르는 칸(44)이 칩(약 21)보다 커서 위아래로 넘치게 두어 칩 줄 높이를 늘리지 않는다.
    // 마지막 칸의 여백만큼 바깥으로 밀어 아이콘이 본문 끝에 맞는다 — 모바일은 오른쪽 끝, lg 는 왼쪽 끝
    <div className="-my-2.5 -mr-2.5 flex shrink-0 items-center lg:relative lg:my-0 lg:-ml-[9px] lg:mr-0 lg:justify-self-start">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        className={`${ACTION} ${LG_ONLY} text-gray-900 disabled:opacity-60`}
      >
        <Heart
          className={ICON}
          strokeWidth={STROKE}
          style={liked ? { fill: "var(--color-red-500)", stroke: "var(--color-red-500)" } : undefined}
          aria-hidden="true"
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

      {/* 저장되면 북마크를 라임으로 채운다 (윤곽선도 라임 — ScrapButton 기본 savedStyle). 사진 위 · 아래 저장 버튼과 상태가 함께 바뀐다 */}
      <ScrapButton
        postId={postId}
        initialSaved={isSaved}
        isLoggedIn={isLoggedIn}
        size="lg"
        className={`${ACTION} disabled:opacity-60`}
        unsavedClassName="text-gray-900"
        strokeWidth={STROKE}
      />

      <button type="button" onClick={share} aria-label="Share" className={`${ACTION} ${LG_ONLY} text-gray-900`}>
        <Share2 className={ICON} strokeWidth={STROKE} aria-hidden="true" />
      </button>

      {/* 신고는 사진 위 더보기 메뉴와 같은 항목 하나 */}
      <button
        type="button"
        aria-label="More options"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className={`${ACTION} ${LG_ONLY} text-gray-900`}
      >
        <MoreVertical className={ICON} strokeWidth={STROKE} aria-hidden="true" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-11 right-0 z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); if (!isLoggedIn) { showError("Please sign in to report content."); return; } setReportOpen(true); }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Flag className="size-4 shrink-0" />
              Report
            </button>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} postId={postId} />
    </div>
  );
}
