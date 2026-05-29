"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { SavedToggleButton } from "./SavedToggleButton";

interface Props {
  isLoggedIn: boolean;
}

export function DiscoverSearchBar({ isLoggedIn }: Props) {
  return (
    <div className="absolute top-0 inset-x-0 z-[60] px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        {/* 검색바 — /search 라우팅 */}
        <Link
          href="/search"
          className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-10 shadow-md"
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Search places</span>
        </Link>

        {/* 필터 버튼 — 시각만 */}
        <button
          type="button"
          aria-label="Filter"
          className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:opacity-70 transition-opacity"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* 북마크 — SavedToggleButton (flex item으로 동작) */}
        <SavedToggleButton isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
