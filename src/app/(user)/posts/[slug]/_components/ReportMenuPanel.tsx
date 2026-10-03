"use client";

import { Flag } from "lucide-react";
import { showError } from "@/lib/toast";

interface Props {
  isLoggedIn: boolean;
  /** 메뉴 상자의 오른쪽 자리 — 사진 위 더보기(right-0.5)와 lg 칩 줄 더보기(right-0)가 조금 다르다 */
  positionClassName: string;
  onClose: () => void;
  onReport: () => void;
}

// 더보기를 누르면 뜨는 메뉴 상자. 항목은 신고 하나 — 사진 위 더보기(PostDetailHeader)와 lg 더보기(PostMoreMenu)가 같이 쓴다.
// 바깥(투명 덮개)을 누르면 닫힌다. 열림 상태와 신고 창은 부르는 쪽이 가진다
export function ReportMenuPanel({ isLoggedIn, positionClassName, onClose, onReport }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className={`absolute top-11 ${positionClassName} z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]`}>
        <button
          type="button"
          onClick={() => { onClose(); if (!isLoggedIn) { showError("Please sign in to report content."); return; } onReport(); }}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <Flag className="size-4 shrink-0" />
          Report
        </button>
      </div>
    </>
  );
}
