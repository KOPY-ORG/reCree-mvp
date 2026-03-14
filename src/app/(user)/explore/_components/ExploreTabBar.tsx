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
    <div className="fixed bottom-16 left-0 right-0 z-30 flex justify-center pb-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center rounded-full bg-background shadow-[0_1px_4px_rgba(0,0,0,0.1)] p-1 gap-1 opacity-90">
        {(["posts", "hall"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all capitalize ${
              tab === t
                ? "bg-brand text-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "posts" ? "Posts" : "Hall"}
          </button>
        ))}
      </div>
    </div>
  );
}
