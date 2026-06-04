"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Props = {
  variant: "active";
  activeQuery: string;
  onClear: () => void;
  className?: string;
};

export function SearchBar(props: Props) {
  const router = useRouter();

  return (
    <div className={`flex items-center h-9 rounded-full border border-border bg-muted/30 px-3 gap-2 ${props.className ?? ""}`}>
      <button
        className="flex items-center gap-2 flex-1 min-w-0"
        onClick={() => router.push("/discover")}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">{props.activeQuery}</span>
      </button>
      <button
        onClick={props.onClear}
        className="size-4 shrink-0 rounded-full bg-muted-foreground/25 flex items-center justify-center"
        aria-label="검색 초기화"
      >
        <X className="size-2.5 text-foreground" strokeWidth={2.5} />
      </button>
    </div>
  );
}
