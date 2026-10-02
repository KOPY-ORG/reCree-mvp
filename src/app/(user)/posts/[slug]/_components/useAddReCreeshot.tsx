"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginPromptDialog } from "@/app/(user)/_components/LoginPromptDialog";

interface Options {
  postId: string;
  originalImageUrl: string | null;
  isLoggedIn: boolean;
}

// recreeshot 추가 흐름 — 상세의 추가 카드와 배너 카메라 버튼이 같이 쓴다.
// 로그인했으면 편집기로 보내고, 아니면 로그인 안내 다이얼로그를 띄운다
export function useAddReCreeshot({ postId, originalImageUrl, isLoggedIn }: Options) {
  const router = useRouter();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  function handleAdd() {
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }
    const params = new URLSearchParams({ postId });
    if (originalImageUrl) params.set("referenceUrl", originalImageUrl);
    router.push(`/recreeshot/new?${params.toString()}`);
  }

  const loginDialog = (
    <LoginPromptDialog
      open={showLoginDialog}
      onOpenChange={setShowLoginDialog}
      title="Sign in to add a recreeshot"
      description="Share your recreation photo and compare it with the original."
    />
  );

  return { handleAdd, loginDialog };
}
