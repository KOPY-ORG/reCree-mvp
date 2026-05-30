"use client";

import { Search, SlidersHorizontal, X, MapPin } from "lucide-react";
import { SavedToggleButton } from "./SavedToggleButton";

type DiscoverSuggestion =
  | { type: "keyword"; text: string }
  | { type: "post"; text: string; placeName: string; placeId: string };

interface Props {
  isLoggedIn: boolean;
  query: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onQueryChange: (q: string) => void;
  onClearQuery: () => void;
  suggestions: DiscoverSuggestion[];
  recents: string[];
  onSelectTerm: (term: string) => void;
  onSelectPlace: (placeId: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecents: () => void;
}

export function DiscoverSearchBar({
  isLoggedIn,
  query,
  isOpen,
  onOpen,
  onClose,
  onQueryChange,
  onClearQuery,
  suggestions,
  recents,
  onSelectTerm,
  onSelectPlace,
  onRemoveRecent,
  onClearRecents,
}: Props) {
  if (isOpen) {
    return (
      <div className="fixed inset-0 z-[70] bg-white flex flex-col">
        {/* 상단 바 */}
        <div
          className="flex items-center gap-2 px-3 pt-3 pb-2 bg-white"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" /* matches .app-header shadow */ }}
        >
          <div className="flex-1 flex items-center rounded-full bg-muted h-10 overflow-hidden">
            {/* 좌측~중앙: 장식 돋보기 + input + X */}
            <div className="flex-1 flex items-center gap-2 px-4 min-w-0">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const q = query.trim();
                    if (q) onSelectTerm(q);
                  }
                }}
                enterKeyHint="search"
                placeholder="Search places"
                className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={onClearQuery}
                  className="shrink-0 text-muted-foreground flex items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* 우측 검색 실행 버튼 — pill 우측에 잘림 */}
            <button
              type="button"
              aria-label="Search"
              disabled={!query.trim()}
              onClick={() => {
                const q = query.trim();
                if (q) onSelectTerm(q);
              }}
              className="self-stretch shrink-0 px-4 flex items-center bg-brand-sub disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-foreground"
          >
            Cancel
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {query.trim() === "" ? (
            recents.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No recent searches</p>
            ) : (
              <>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold text-foreground">Recent</span>
                  <button
                    type="button"
                    onClick={onClearRecents}
                    className="text-sm text-muted-foreground"
                  >
                    Clear all
                  </button>
                </div>
                {recents.map((term) => (
                  <div
                    key={term}
                    className="flex items-center justify-between py-2.5 cursor-pointer"
                    onClick={() => onSelectTerm(term)}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{term}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemoveRecent(term); }}
                      className="shrink-0 text-muted-foreground flex items-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No matching places</p>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => s.type === "post" ? onSelectPlace(s.placeId) : onSelectTerm(s.text)}
                className="w-full flex items-center gap-3 px-1 py-3 text-left"
              >
                {s.type === "post" ? (
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                {s.type === "post" ? (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm text-foreground">{s.placeName || "Unnamed"}</span>
                    {s.text && (
                      <span className="truncate text-xs text-muted-foreground">{s.text}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-foreground">{s.text}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  /* Closed bar */
  return (
    <div className="absolute top-0 inset-x-0 z-[60] px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-10 shadow-md"
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className={`flex-1 text-sm text-left ${query ? "text-foreground" : "text-muted-foreground"}`}>
            {query || "Search places"}
          </span>
          {query && (
            <span
              role="button"
              tabIndex={0}
              className="shrink-0 text-muted-foreground flex items-center"
              onClick={(e) => { e.stopPropagation(); onClearQuery(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClearQuery(); } }}
            >
              <X className="w-4 h-4" />
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label="Filter"
          className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:opacity-70 transition-opacity"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <SavedToggleButton isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
