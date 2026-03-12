"use client";

import { useTransition, useState } from "react";
import { Bookmark } from "lucide-react";
import { toggleScrap } from "../_actions/scrap-actions";

interface Props {
  postId: string;
  initialSaved: boolean;
  size?: "sm" | "md";
}

type Toast = { message: string; key: number };

export function ScrapButton({ postId, initialSaved, size = "md" }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const unsavedClass =
    size === "sm"
      ? "text-white/80 hover:text-white"
      : "text-muted-foreground hover:text-foreground";

  function showToast(message: string) {
    const key = Date.now();
    setToast({ message, key });
    setTimeout(() => setToast((t) => (t?.key === key ? null : t)), 2000);
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const optimistic = !saved;
    setSaved(optimistic);

    startTransition(async () => {
      const result = await toggleScrap(postId);

      if (result.error === "unauthenticated") {
        setSaved(saved);
        showToast("Sign in to save");
        return;
      }

      if (result.error) {
        setSaved(saved);
        showToast("Something went wrong");
        return;
      }

      setSaved(result.saved);
      showToast(result.saved ? "Saved!" : "Removed");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="transition-colors disabled:opacity-60"
      >
        <Bookmark
          className={`${iconSize} ${saved ? "" : unsavedClass}`}
          strokeWidth={1.5}
          style={saved ? { fill: "#C8FF09", stroke: "#C8FF09" } : undefined}
        />
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
