"use client";

import { useToast } from "@/app/(user)/_hooks/useToast";

// 게시글 공유 — 사진 위 공유 버튼(PostDetailHeader)과 lg 제목 아래 공유(PostActionBar)가 같이 쓴다.
// 시스템 공유창이 있으면 그것, 없으면 링크 복사, 그것도 안 되면 prompt 로 링크를 보여준다
export function useSharePost(titleEn: string) {
  const { toast, showToast } = useToast();

  async function share() {
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

  return { share, toast };
}
