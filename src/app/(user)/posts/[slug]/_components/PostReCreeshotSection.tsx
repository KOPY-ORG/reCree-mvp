"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogIn } from "lucide-react";
import Link from "next/link";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Shot {
  id: string;
  imageUrl: string;
}

interface Props {
  postId: string;
  shots: Shot[];
  originalImageUrl: string | null;
  isLoggedIn: boolean;
}

export function PostReCreeshotSection({ postId, shots, originalImageUrl, isLoggedIn }: Props) {
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

  return (
    <div className="mt-3">
      {shots.length === 0 ? (
        // 아직 아무도 올리지 않았으면 제목과 빈 줄 대신 추가 카드 하나만 둔다
        <button
          type="button"
          onClick={handleAdd}
          className="surface-card mx-4 flex w-[calc(100%-2rem)] items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-70"
        >
          {/* 점선 상자 대신 면 원 안의 카메라 — 위아래 카드와 같은 표면에서 "추가" 를 말한다 */}
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Camera className="size-5 text-foreground" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Add recreeshot</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Share your recreation photo and compare it with the original.
            </span>
          </span>
        </button>
      ) : (
      <>
      {/* 섹션 헤더 */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">How others reCree&apos;d</p>
        <span className="text-xs text-muted-foreground">{shots.length} shots</span>
      </div>

      {/* 가로 스크롤 */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {/* Add 버튼 */}
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 w-[140px] aspect-[4/5] rounded-[7%] border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Camera className="size-6 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground leading-tight text-center">Add<br />recreeshot</span>
        </button>

        {/* 리크리샷 카드 목록 */}
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => router.push(`/recreeshot/${shot.id}`)}
            className="shrink-0 w-[140px]"
          >
            <ReCreeshotImage
              shotUrl={shot.imageUrl}
              variant="thumb-md"
              className="aspect-[4/5] shadow-md"
              sizes="140px"
            />
          </button>
        ))}
      </div>
      </>
      )}

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
    </div>
  );
}
