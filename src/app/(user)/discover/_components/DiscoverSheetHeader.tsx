"use client";

interface DiscoverSheetHeaderProps {
  contentTab: "hot" | "list";
  onContentTabChange: (tab: "hot" | "list") => void;
  placeCount: number;
}

export function DiscoverSheetHeader({
  contentTab,
  onContentTabChange,
  placeCount,
}: DiscoverSheetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center rounded-full bg-muted p-1 gap-0.5">
        <button
          type="button"
          onClick={() => onContentTabChange("hot")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            contentTab === "hot"
              ? "bg-white text-foreground shadow-sm"
              : "bg-transparent text-muted-foreground"
          }`}
        >
          🔥 Hot
        </button>
        <button
          type="button"
          onClick={() => onContentTabChange("list")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            contentTab === "list"
              ? "bg-white text-foreground shadow-sm"
              : "bg-transparent text-muted-foreground"
          }`}
        >
          List
        </button>
      </div>

      <span className="text-sm text-muted-foreground">
        {placeCount} places
      </span>
    </div>
  );
}
