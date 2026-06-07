"use client";

import { useState, useTransition } from "react";
import { Heart, Bookmark } from "lucide-react";
import { toggleReCreeshotLike, toggleReCreeshotSave } from "@/app/(user)/_actions/recreeshot-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  reCreeshotId: string;
  initialLiked: boolean;
  initialSaved: boolean;
  likeCount: number;
}

export function HallDetailClient({
  reCreeshotId,
  initialLiked,
  initialSaved,
  likeCount: initialLikeCount,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likePending, startLikeTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleLike() {
    const optimistic = !liked;
    setLiked(optimistic);
    setLikeCount((c) => c + (optimistic ? 1 : -1));

    startLikeTransition(async () => {
      const result = await toggleReCreeshotLike(reCreeshotId);
      if (result.error === "unauthenticated") {
        setLiked(liked);
        setLikeCount(initialLikeCount);
        showToast("Sign in to like");
        return;
      }
      if (result.error) {
        setLiked(liked);
        setLikeCount(initialLikeCount);
        showToast("Something went wrong");
        return;
      }
      setLiked(result.liked);
    });
  }

  function handleSave() {
    const optimistic = !saved;
    setSaved(optimistic);

    startSaveTransition(async () => {
      const result = await toggleReCreeshotSave(reCreeshotId);
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
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          disabled={likePending}
          className="flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          <Heart
            className="size-5"
            strokeWidth={1.5}
            style={liked ? { fill: "#ef4444", stroke: "#ef4444" } : undefined}
          />
          {likeCount > 0 && (
            <span className="text-sm text-muted-foreground">{likeCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={savePending}
          className="transition-colors disabled:opacity-60"
        >
          <Bookmark
            className="size-5"
            strokeWidth={1.5}
            style={saved ? { fill: "#C8FF09", stroke: "#C8FF09" } : undefined}
          />
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
