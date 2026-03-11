"use client";

import { useState, useMemo, useEffect, useId } from "react";
import { Search, GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  topicLabels?: { id: string; nameEn: string; colorHex: string | null }[];
};

function SortableSelectedRow({
  post,
  onRemove,
}: {
  post: PickablePost;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-border/60"
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0"
      >
        <GripVertical className="size-4" />
      </span>
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl}
          alt=""
          className="size-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="size-8 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{post.titleKo}</p>
        <p className="text-[10px] text-muted-foreground truncate">{post.titleEn}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(post.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
        aria-label="선택 해제"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

interface PostPickerDialogProps {
  open: boolean;
  onClose: () => void;
  posts: PickablePost[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  maxSelect?: number;
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
  const dndId = useId();

  // 다이얼로그가 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setPicked(selectedIds);
      setQuery("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const postMap = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  const selectedPosts = useMemo(
    () => picked.map((id) => postMap.get(id)).filter((p): p is PickablePost => !!p),
    [picked, postMap]
  );

  const unselectedFiltered = useMemo(() => {
    const q = query.toLowerCase();
    return posts
      .filter((p) => !picked.includes(p.id))
      .filter(
        (p) =>
          !q ||
          p.titleEn.toLowerCase().includes(q) ||
          p.titleKo.toLowerCase().includes(q)
      );
  }, [posts, picked, query]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = picked.indexOf(active.id as string);
    const newIdx = picked.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    setPicked(arrayMove(picked, oldIdx, newIdx));
  }

  function add(id: string) {
    if (maxSelect !== undefined && picked.length >= maxSelect) return;
    setPicked((prev) => [...prev, id]);
  }

  function remove(id: string) {
    setPicked((prev) => prev.filter((x) => x !== id));
  }

  function handleConfirm() {
    onConfirm(picked);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>포스트 선택</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* 선택된 포스트 — 드래그 순서 변경 */}
          {selectedPosts.length > 0 && (
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                선택됨 ({selectedPosts.length}개) — 드래그로 순서 변경
              </p>
              <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={picked} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {selectedPosts.map((post) => (
                      <SortableSelectedRow key={post.id} post={post} onRemove={remove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* 검색 */}
          <div className="px-4 py-3 border-b shrink-0">
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

          {/* 미선택 포스트 목록 */}
          <div className="flex-1 overflow-y-auto">
            {unselectedFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {!query && picked.length > 0
                  ? "모든 포스트가 선택되었습니다."
                  : "검색 결과 없음"}
              </p>
            ) : (
              unselectedFiltered.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => add(post.id)}
                  disabled={maxSelect !== undefined && picked.length >= maxSelect}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors disabled:opacity-40"
                >
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{post.titleKo}</p>
                    <p className="text-xs text-muted-foreground truncate">{post.titleEn}</p>
                    {post.topicLabels && post.topicLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {post.topicLabels.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
                            style={{
                              backgroundColor: t.colorHex ?? "#BABABA",
                              color: "#FCFCFC",
                            }}
                          >
                            {t.nameEn}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t flex justify-between items-center shrink-0">
          <p className="text-sm text-muted-foreground">
            {picked.length}개 선택
            {maxSelect !== undefined ? ` (최대 ${maxSelect}개)` : ""}
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
