"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Flag } from "lucide-react";
import { showError } from "@/lib/toast";
import { ReportDialog } from "@/components/ReportDialog";

interface Props {
  postId?: string;
  isLoggedIn?: boolean;
}

export function PostDetailHeader({ postId, isLoggedIn }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      {/* lg: 배너가 헤더 밑으로 들어가지 않으므로 투명 오버레이 대신 .app-header 와 같은 바가 된다 */}
      <div className="fixed top-0 left-0 right-0 z-50 h-12 lg:top-[var(--top-nav-space)] lg:bg-background/95 lg:backdrop-blur-sm lg:shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
        <div className="max-w-[var(--app-col-w)] mx-auto h-full flex items-center justify-between px-3 lg:max-w-[73rem] lg:px-6">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/discover");
            }
          }}
          className="flex items-center justify-center h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] lg:text-foreground lg:drop-shadow-none" />
        </button>

        {postId && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center h-8 w-8"
            >
              <MoreVertical className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] lg:text-foreground lg:drop-shadow-none" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-10 right-0 z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]">
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

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={postId}
      />
    </>
  );
}
