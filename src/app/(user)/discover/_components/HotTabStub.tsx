const SECTIONS = ["Trending now", "Theme routes", "Area hotspots"] as const;

export function HotTabStub() {
  return (
    <div className="px-4 pb-4 space-y-6">
      {SECTIONS.map((title) => (
        <div key={title}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground">See all ›</span>
          </div>
          <div className="rounded-xl bg-muted h-24 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      ))}
    </div>
  );
}
