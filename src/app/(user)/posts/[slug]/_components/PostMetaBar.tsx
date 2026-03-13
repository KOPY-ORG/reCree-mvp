"use client";

import { Upload } from "lucide-react";
import { labelBackground, type ResolvedLabel } from "@/lib/post-labels";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  labels: ResolvedLabel[];
  isSaved: boolean;
  postId: string;
  titleEn: string;
}

export function PostMetaBar({ labels, isSaved, postId, titleEn }: Props) {
  const { toast, showToast } = useToast();

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: titleEn, url });
      } catch {
        // 사용자 취소 등 — 무시
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied!");
      return;
    } catch {
      // HTTP 등 clipboard 불가 → prompt fallback
    }

    prompt("Copy this link:", url);
  }

  return (
    <div className="relative flex justify-between items-start px-4 pt-3 pb-2">
      {/* 배지 영역 */}
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 mr-3">
        {labels.map((label, i) => (
          <span
            key={i}
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ background: labelBackground(label), color: label.textColorHex }}
          >
            {label.text}
          </span>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
          <Upload className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <ScrapButton postId={postId} initialSaved={isSaved} size="md" />
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </div>
  );
}
