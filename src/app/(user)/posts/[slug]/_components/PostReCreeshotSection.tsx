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
      {/* 섹션 헤더 */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">How others reCree&apos;d</p>
        {shots.length > 0 && (
          <span className="text-xs text-muted-foreground">{shots.length} shots</span>
        )}
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
