"use client";

import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscoverFilterSheet({ isOpen, onClose }: Props) {
  return (
    <>
      {/* 딤 overlay — 항상 마운트, opacity transition으로 페이드, 닫혀있을 때 pointer-events 차단 해제 */}
      <div
        className={`absolute inset-0 z-[64] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 시트 본체 — 항상 마운트, transform으로 숨김/표시 */}
      <div
        className={`absolute top-12 inset-x-0 bottom-0 z-[65] bg-background rounded-t-2xl flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
          <h2 className="text-base font-bold">Filters</h2>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="flex items-center justify-center size-8 rounded-full bg-muted active:opacity-60 transition-opacity"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 콘텐츠 (다음 청크에서 채움) */}
        <div className="flex-1 overflow-y-auto" />
      </div>
    </>
  );
}
