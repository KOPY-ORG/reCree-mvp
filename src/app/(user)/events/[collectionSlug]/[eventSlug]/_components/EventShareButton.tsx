"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/app/(user)/_hooks/useToast";

interface Props {
  title: string;
}

export function EventShareButton({ title }: Props) {
  const { toast, showToast } = useToast();

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
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
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          background: "rgba(20,16,18,.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Share2 size={16} color="#fff" strokeWidth={1.5} />
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </>
  );
}
