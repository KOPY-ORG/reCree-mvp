"use client";

import { X, Flame, List as ListIcon } from "lucide-react";

interface DiscoverSheetHeaderProps {
  contentTab: "hot" | "list";
  onContentTabChange: (tab: "hot" | "list") => void;
  placeCount: number;
  isResultMode: boolean;
  isSavedView?: boolean;
  query: string;
  onExitResultMode: () => void;
}

export function DiscoverSheetHeader({
  contentTab,
  onContentTabChange,
  placeCount,
  isResultMode,
  isSavedView = false,
  query,
  onExitResultMode,
}: DiscoverSheetHeaderProps) {
  return (
    <div className={`flex items-center px-4 ${isResultMode || isSavedView ? "justify-between pt-2 pb-4" : "justify-center pt-1 pb-3"}`}>
      {isSavedView ? (
        <>
          <span className="text-lg font-semibold text-foreground">My Maps</span>
          <span className="text-sm text-muted-foreground">{placeCount} places</span>
        </>
      ) : isResultMode ? (
        <>
          <div className="flex items-center min-w-0">
            <span className="text-lg font-semibold text-foreground truncate">{query}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground">{placeCount} results</span>
            <button
              type="button"
              onClick={onExitResultMode}
              aria-label="Exit result mode"
              className="flex items-center justify-center bg-muted rounded-full p-1.5 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="relative flex rounded-full bg-muted p-1 w-48">
          {/* 슬라이딩 인디케이터 */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-brand transition-transform duration-200 ease-out"
            style={{
              width: "calc(50% - 4px)",
              left: 4,
              transform: contentTab === "list" ? "translateX(100%)" : "translateX(0)",
            }}
          />
          <button
            type="button"
            onClick={() => onContentTabChange("hot")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold ${
              contentTab === "hot" ? "text-black" : "text-muted-foreground"
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            Hot
          </button>
          <button
            type="button"
            onClick={() => onContentTabChange("list")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold ${
              contentTab === "list" ? "text-black" : "text-muted-foreground"
            }`}
          >
            <ListIcon className="w-4 h-4 shrink-0" />
            List
          </button>
        </div>
      )}
    </div>
  );
}
