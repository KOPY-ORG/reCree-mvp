"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type PickablePost = {
  id: string;
  titleEn: string;
  titleKo: string;
  thumbnailUrl: string | null;
};

interface PostPickerDialogProps {
  open: boolean;
  onClose: () => void;
  posts: PickablePost[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  maxSelect?: number; // 최대 선택 수 (미지정 = 무제한)
}

export function PostPickerDialog({
  open,
  onClose,
  posts,
  selectedIds,
  onConfirm,
  maxSelect,
}: PostPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selectedIds);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleKo.toLowerCase().includes(q)
    );
  }, [posts, query]);

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (maxSelect !== undefined && prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  }

  function handleConfirm() {
    onConfirm(picked);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle>포스트 선택</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="포스트 검색..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              검색 결과 없음
            </p>
          ) : (
            filtered.map((post) => {
              const isSelected = picked.includes(post.id);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => toggle(post.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors ${
                    isSelected ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="size-4 shrink-0 rounded border flex items-center justify-center border-border">
                    {isSelected && <Check className="size-3" />}
                  </div>
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="size-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{post.titleEn}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {post.titleKo}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {picked.length}개 선택{maxSelect !== undefined ? ` (최대 ${maxSelect}개)` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              취소
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
