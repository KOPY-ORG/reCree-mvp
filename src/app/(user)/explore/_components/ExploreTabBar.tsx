"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, LogIn } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ExploreTabBar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "posts";
  const router = useRouter();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  function switchTab(newTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <>
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
            onClick={() => isLoggedIn ? router.push("/explore/hall/new") : setShowLoginDialog(true)}
            className="pointer-events-auto absolute right-4 size-12 rounded-full text-black flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.25),0_1px_4px_rgba(0,0,0,0.15)] opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-brand) 0%, white 150%)" }}
          >
            <Plus className="size-6" />
          </button>
        )}
      </div>
    </div>

    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="max-w-xs rounded-2xl text-center">
        <DialogHeader className="items-center gap-3">
          <LogIn className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <DialogTitle>Sign in to add a recreeshot</DialogTitle>
          <DialogDescription>
            Share your recreation photo and compare it with the original.
          </DialogDescription>
        </DialogHeader>
        <Link
          href="/login"
          className="mt-2 w-full py-2.5 rounded-full bg-brand text-black text-sm font-semibold text-center block transition-opacity hover:opacity-80"
        >
          Sign in
        </Link>
      </DialogContent>
    </Dialog>
    </>
  );
}
