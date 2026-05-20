"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Star, LogIn } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  isLoggedIn: boolean;
}

export function SavedToggleButton({ isLoggedIn }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const isSavedView = searchParams.get("saved") === "1";

  function toggle() {
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (isSavedView) {
      params.delete("saved");
    } else {
      params.set("saved", "1");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={isSavedView ? "Show all places" : "Show saved places"}
        className={`absolute top-3 right-3 z-30 flex items-center justify-center size-10 rounded-full shadow-lg active:opacity-70 transition-colors ${
          isSavedView ? "bg-brand text-black" : "bg-background/90 text-foreground"
        }`}
      >
        <Star className="size-5" fill={isSavedView ? "currentColor" : "none"} />
      </button>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <DialogHeader className="items-center gap-3">
            <LogIn className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <DialogTitle>Sign in to view saved places</DialogTitle>
            <DialogDescription>
              Save posts to bookmark locations and view them on the map.
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
