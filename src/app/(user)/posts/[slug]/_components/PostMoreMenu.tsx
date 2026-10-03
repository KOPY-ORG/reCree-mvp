"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { ACTION, ICON, STROKE } from "./PostActionBar";
import { ReportMenuPanel } from "./ReportMenuPanel";

interface Props {
  postId: string;
  isLoggedIn: boolean;
}

// lg 전용 더보기 — 왼쪽 열 칩 줄 오른쪽 끝. 모바일은 사진 위 더보기(PostDetailHeader)가 맡는다.
// 항목은 사진 위 메뉴와 같은 신고 하나. 칸(42)이 칩(약 25)보다 커서 위아래로 넘치게 두어 칩 줄 높이를 늘리지 않고,
// 칸의 여백만큼 오른쪽으로 밀어 아이콘이 열 끝에 맞는다
export function PostMoreMenu({ postId, isLoggedIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="relative -my-2 -mr-[9px] hidden shrink-0 lg:block">
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
        <ReportMenuPanel
          isLoggedIn={isLoggedIn}
          positionClassName="right-0"
          onClose={() => setMenuOpen(false)}
          onReport={() => setReportOpen(true)}
        />
      )}

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} postId={postId} />
    </div>
  );
}
