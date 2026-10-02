"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Flag, Share2 } from "lucide-react";
import { showError } from "@/lib/toast";
import { canGoBackInApp } from "@/lib/in-app-history";
import { ReportDialog } from "@/components/ReportDialog";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { useSharePost } from "./useSharePost";

interface Props {
  postId?: string;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  titleEn?: string;
}

/** 사진 위 버튼 하나. 뒤로가기 · 공유 · 저장 · 더보기가 같은 원을 쓴다 (카메라는 BannerReCreeshotButton) */
const ROUND = "photo-action press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
const ICON = "size-5";

export function PostDetailHeader({ postId, isLoggedIn, isSaved = false, titleEn = "" }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { share: handleShare, toast } = useSharePost(titleEn);

  // 모바일 전용 — 화면 위에 고정된 투명 줄. 사진을 지나 본문 위에서도 버튼이 떠 있다.
  // lg 는 상단 바가 있어 뒤로가기가 필요 없고, 공유 · 저장 · 더보기는 제목 아래 아이콘 줄(PostActionBar)이 맡는다
  const frame = "fixed top-0 left-0 right-0 z-50 h-14 lg:hidden";
  const inner = "max-w-[var(--app-col-w)] mx-auto h-full flex items-center justify-between px-2.5";

  return (
    <>
      <div className={frame}>
        <div className={inner}>
          <button
            type="button"
            aria-label="Back"
            // 앞 페이지가 우리 사이트면 뒤로, 검색 · 공유 링크로 바로 들어왔으면 홈으로
            onClick={() => (canGoBackInApp() ? router.back() : router.push("/feed"))}
            className={ROUND}
          >
            <ArrowLeft className={ICON} strokeWidth={2} aria-hidden="true" />
          </button>

          {postId && (
            <div className="relative flex items-center gap-1">
              <button type="button" onClick={handleShare} aria-label="Share" className={ROUND}>
                <Share2 className={ICON} strokeWidth={2} aria-hidden="true" />
              </button>
              {/* 저장되면 아이콘만 라임으로 채운다 — 원 색은 그대로. 좋아요 줄의 저장 버튼과 상태가 함께 바뀐다 */}
              <ScrapButton
                postId={postId}
                initialSaved={isSaved}
                isLoggedIn={!!isLoggedIn}
                size="md"
                className={`${ROUND} disabled:opacity-60`}
                unsavedClassName="text-white"
              />
              <button
                type="button"
                aria-label="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className={ROUND}
              >
                <MoreVertical className={ICON} strokeWidth={2} aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute top-11 right-0.5 z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]">
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
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={postId}
      />
    </>
  );
}
