"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Props =
  | { variant?: "link"; className?: string }
  | {
      variant: "input";
      value: string;
      onChange: (v: string) => void;
      autoFocus?: boolean;
      className?: string;
    }
  | {
      variant: "active";
      activeQuery: string;
      onClear: () => void;
      className?: string;
    };

export function SearchBar(props: Props) {
  const router = useRouter();

  if (props.variant === "input") {
    return (
      <div className={`relative flex-1 ${props.className ?? ""}`}>
        <input
          type="text"
          autoFocus={props.autoFocus}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Search K-artists, dramas, foods"
          className="w-full h-9 pl-3 pr-14 rounded-full border border-border bg-muted/30 text-sm focus:outline-none focus:border-brand transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {props.value && (
            <button
              type="button"
              onClick={() => props.onChange("")}
              className="flex items-center justify-center size-4 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
            >
              <X className="size-2.5 text-background" strokeWidth={2.5} />
            </button>
          )}
          <button type="submit" className="text-muted-foreground hover:text-foreground">
            <Search className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (props.variant === "active") {
    return (
      <div className={`flex items-center h-9 rounded-full border border-border bg-muted/30 px-3 gap-2 ${props.className ?? ""}`}>
        <button
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => router.push("/search")}
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

  // variant="link" (기본)
  return (
    <Link
      href="/search"
      className={`flex items-center gap-2 h-9 w-full rounded-full border border-border bg-muted/30 px-3 hover:border-brand transition-colors ${props.className ?? ""}`}
    >
      <Search className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground truncate">
        Search K-artists, dramas, foods
      </span>
    </Link>
  );
}
