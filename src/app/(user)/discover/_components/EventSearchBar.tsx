"use client";

import { Search, X } from "lucide-react";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onClear: () => void;
  onExit: () => void;
}

export function EventSearchBar({ query, onQueryChange, onClear, onExit }: Props) {
  return (
    <div className="absolute top-0 inset-x-0 z-[60] px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-10 shadow-md">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search events"
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-muted-foreground flex items-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Exit event mode"
          onClick={onExit}
          className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
