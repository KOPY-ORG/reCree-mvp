"use client";

import { useState } from "react";
import { Flag, MoreVertical } from "lucide-react";
import { showError } from "@/lib/toast";
import { ReportDialog } from "@/components/ReportDialog";
import { ACTION, ICON, STROKE } from "./PostActionBar";

interface Props {
  postId: string;
  isLoggedIn: boolean;
}

// lg 전용 더보기 — 칩 줄 오른쪽 끝. 모바일은 사진 위 더보기(PostDetailHeader)가 맡는다.
// 항목은 사진 위 메뉴와 같은 신고 하나. 칸(42)이 칩(약 25)보다 커서 위아래로 넘치게 두어 칩 줄 높이를 늘리지 않고,
// 칸의 여백만큼 오른쪽으로 밀어 아이콘이 열 끝에 맞는다
export function PostMoreMenu({ postId, isLoggedIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="relative -my-2 -mr-[9px] hidden lg:col-start-2 lg:row-start-1 lg:block">
      <button
        type="button"
        aria-label="More options"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className={`${ACTION} text-gray-900`}
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

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} postId={postId} />
    </div>
  );
}
