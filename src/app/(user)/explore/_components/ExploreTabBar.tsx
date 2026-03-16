"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

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
    <div className="fixed bottom-16 left-0 right-0 z-30 pb-3 pointer-events-none">
      <div className="relative flex justify-center items-center">
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
        {tab === "hall" && (
          <button
            onClick={() => router.push("/explore/hall/new")}
            className="pointer-events-auto absolute right-4 size-9 rounded-full text-black flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.15)] opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-brand) 0%, white 150%)" }}
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
