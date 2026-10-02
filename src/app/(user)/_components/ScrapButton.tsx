"use client";

import { useEffect, useTransition, useState } from "react";
import { Bookmark } from "lucide-react";
import { toggleScrap } from "../_actions/scrap-actions";
import { useToast } from "../_hooks/useToast";

interface Props {
  postId: string;
  initialSaved: boolean;
  size?: "sm" | "md" | "lg";
  unsavedClassName?: string;
  savedStyle?: React.CSSProperties;
  strokeLinejoin?: React.SVGAttributes<SVGElement>["strokeLinejoin"];
  onSaveChange?: (saved: boolean) => void;
  /** 버튼 자체의 모양. 없으면 아이콘만 있는 기본 버튼 */
  className?: string;
}

// 같은 화면에 같은 글의 저장 버튼이 둘 있을 수 있다 (상세의 사진 위 · 좋아요 줄).
// 한쪽에서 바뀌면 이 이벤트로 나머지도 같은 상태가 된다
const SCRAP_CHANGE = "scrap-change";
type ScrapChange = CustomEvent<{ postId: string; saved: boolean }>;

export function ScrapButton({ postId, initialSaved, size = "md", unsavedClassName, savedStyle, strokeLinejoin = "round", onSaveChange, className }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const unsavedClass = unsavedClassName ?? "text-muted-foreground hover:text-foreground";
  const activeSavedStyle = savedStyle ?? { fill: "#D3FD52", stroke: "#D3FD52" };

  useEffect(() => {
    function onChange(e: Event) {
      const { detail } = e as ScrapChange;
      if (detail.postId === postId) setSaved(detail.saved);
    }
    window.addEventListener(SCRAP_CHANGE, onChange);
    return () => window.removeEventListener(SCRAP_CHANGE, onChange);
  }, [postId]);

  function apply(next: boolean) {
    setSaved(next);
    onSaveChange?.(next);
    window.dispatchEvent(new CustomEvent(SCRAP_CHANGE, { detail: { postId, saved: next } }));
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    apply(!saved);

    startTransition(async () => {
      const result = await toggleScrap(postId);

      if (result.error === "unauthenticated") {
        apply(saved);
        showToast("Sign in to save");
        return;
      }

      if (result.error) {
        apply(saved);
        showToast("Something went wrong");
        return;
      }

      apply(result.saved);
      showToast(result.saved ? "Saved!" : "Removed");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={saved ? "Remove from saved" : "Save"}
        aria-pressed={saved}
        className={className ?? "transition-colors disabled:opacity-60"}
      >
        <Bookmark
          aria-hidden="true"
          className={`${iconSize} ${saved ? "" : unsavedClass}`}
          strokeWidth={1.5}
          strokeLinejoin={strokeLinejoin}
          style={saved ? activeSavedStyle : undefined}
        />
      </button>

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
