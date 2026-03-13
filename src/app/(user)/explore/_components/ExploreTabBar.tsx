"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ExploreTabBar() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "posts";
  const router = useRouter();

  function switchTab(newTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <div className="flex border-b border-border sticky top-14 bg-background z-10">
      <button
        onClick={() => switchTab("posts")}
        className={`flex-1 text-center py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          tab === "posts"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Posts
      </button>
      <button
        onClick={() => switchTab("hall")}
        className={`flex-1 text-center py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          tab === "hall"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Hall
      </button>
    </div>
  );
}
