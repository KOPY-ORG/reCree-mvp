"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

// 로그인이 필요한 버튼을 비로그인으로 눌렀을 때 뜨는 안내창.
// recreeshot 추가 · 상세의 좋아요 · 저장이 같이 쓴다
export function LoginPromptDialog({ open, onOpenChange, title, description }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-2xl text-center">
        <DialogHeader className="items-center gap-3">
          <LogIn className="size-10 text-muted-foreground" strokeWidth={1.5} />
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
}
