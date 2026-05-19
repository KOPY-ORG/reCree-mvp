"use client";

export function TopicTabs({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex border-b border-border/50 sticky top-12 bg-background z-10">
        <button className="flex-1 py-3 text-sm font-semibold border-b-2 border-foreground">
          Posts
        </button>
        <button
          disabled
          className="flex-1 py-2 text-sm text-muted-foreground/50 cursor-not-allowed leading-tight"
        >
          Spots
          <span className="block text-xs">Coming soon</span>
        </button>
        <button
          disabled
          className="flex-1 py-2 text-sm text-muted-foreground/50 cursor-not-allowed leading-tight"
        >
          Members
          <span className="block text-xs">Coming soon</span>
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
