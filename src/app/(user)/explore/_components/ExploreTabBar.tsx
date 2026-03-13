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
    <div className="flex border-b border-border sticky top-10 bg-background z-10 px-4">
      {(["posts", "hall"] as const).map((t) => (
        <button
          key={t}
          onClick={() => switchTab(t)}
          className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize ${
            tab === t
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t === "posts" ? "Posts" : "Hall"}
        </button>
      ))}
    </div>
  );
}
