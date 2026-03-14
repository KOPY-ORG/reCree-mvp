"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function ExploreSearchActiveBar({ q }: { q: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center h-8 rounded-full border border-border bg-muted/30 px-3 gap-2">
        <button
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => router.push("/search")}
        >
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm truncate">{q}</span>
        </button>
        <button
          onClick={handleClear}
          className="size-4 shrink-0 rounded-full bg-muted-foreground/25 flex items-center justify-center"
          aria-label="검색 초기화"
        >
          <X className="size-2.5 text-foreground" />
        </button>
      </div>
    </div>
  );
}
