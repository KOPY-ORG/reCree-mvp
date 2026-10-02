"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Flag, Share2 } from "lucide-react";
import { showError } from "@/lib/toast";
import { ReportDialog } from "@/components/ReportDialog";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  postId?: string;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  titleEn?: string;
  /**
   * 사진(배너) 안에 렌더됐는가. 모바일은 어느 쪽이든 화면 위에 고정돼 뜬다.
   * lg 는 사진이 왼쪽 열 카드라 — true 면 사진 위쪽에 붙고, false(사진 없는 글)면 지금처럼 바가 된다
   */
  onPhoto?: boolean;
}

/** 사진 위 버튼 하나. 뒤로가기 · 공유 · 저장 · 더보기가 같은 원을 쓴다 (카메라는 BannerReCreeshotButton) */
const ROUND = "photo-action press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
const ICON = "size-5";

export function PostDetailHeader({ postId, isLoggedIn, isSaved = false, titleEn = "", onPhoto = false }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { toast, showToast } = useToast();

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: titleEn, url });
      } catch {
        // 사용자 취소 등 — 무시
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied!");
      return;
    } catch {
      // HTTP 등 clipboard 불가 → prompt fallback
    }

    prompt("Copy this link:", url);
  }

  // 모바일: 화면 위에 고정된 투명 줄. 사진을 지나 본문 위에서도 버튼이 떠 있다.
  // lg + 사진 위: 사진 카드 위쪽에 붙는다(absolute). lg + 사진 없음: .app-header 와 같은 바
  const frame = onPhoto
    ? "fixed top-0 left-0 right-0 z-50 h-14 lg:absolute lg:inset-x-0 lg:top-0"
    : "fixed top-0 left-0 right-0 z-50 h-14 lg:top-[var(--top-nav-space)] lg:bg-background/95 lg:backdrop-blur-sm lg:shadow-[0_1px_4px_rgba(0,0,0,0.07)]";
  const inner = onPhoto
    ? "max-w-[var(--app-col-w)] mx-auto h-full flex items-center justify-between px-2.5 lg:max-w-none"
    : "max-w-[var(--app-col-w)] mx-auto h-full flex items-center justify-between px-2.5 lg:max-w-[73rem] lg:px-5";

  return (
    <>
      <div className={frame}>
        <div className={inner}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/discover");
              }
            }}
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
