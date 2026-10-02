"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="max-w-xs rounded-2xl text-center">
        <DialogHeader className="items-center gap-3">
          <LogIn className="size-10 text-muted-foreground" strokeWidth={1.5} />
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
  );

  return { handleAdd, loginDialog };
}
