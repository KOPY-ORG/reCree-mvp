"use client";

import { useState, useMemo, useEffect, useId } from "react";
import { Search, GripVertical, X, Check } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
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
  placeNameKo?: string | null;
  thumbnailUrl: string | null;
  topicLabels?: { id: string; nameEn: string; colorHex: string | null; textColorHex?: string | null }[];
  tagLabels?: { id: string; nameEn: string; colorHex: string | null; textColorHex?: string | null }[];
  allTopicIds?: string[];
  tagIds?: string[];
  tagGroups?: string[];
};

// ─── 선택된 포스트 (드래그 정렬) ─────────────────────────────────────────────

function SortableSelectedRow({
  post,
  index,
  onRemove,
}: {
  post: PickablePost;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-md border border-zinc-100"
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 shrink-0"
      >
        <GripVertical className="size-4" />
      </span>
      <span className="size-5 shrink-0 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
        {index + 1}
      </span>
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl} alt="" className="size-8 rounded object-cover shrink-0" />
      ) : (
        <div className="size-8 rounded bg-zinc-100 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{post.placeNameKo ?? post.titleKo}</p>
        <p className="text-[10px] text-zinc-400 truncate">{post.titleEn}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(post.id)}
        className="text-zinc-300 hover:text-destructive shrink-0 transition-colors"
        aria-label="선택 해제"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

interface PostPickerDialogProps {
  open: boolean;
  onClose: () => void;
  posts: PickablePost[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  maxSelect?: number;
  filterLabel?: string;
}

export function PostPickerDialog({
  open,
  onClose,
  posts,
  selectedIds,
  onConfirm,
  maxSelect,
  filterLabel,
}: PostPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selectedIds);
  const dndId = useId();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPicked(selectedIds);
      setQuery("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const postMap = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  const selectedPosts = useMemo(
    () => picked.map((id) => postMap.get(id)).filter((p): p is PickablePost => !!p),
    [picked, postMap]
  );

  const filteredPosts = useMemo(() => {
    const q = query.toLowerCase();
    return posts.filter(
      (p) =>
        !q ||
        p.titleEn.toLowerCase().includes(q) ||
        p.titleKo.toLowerCase().includes(q) ||
        (p.placeNameKo?.toLowerCase().includes(q) ?? false)
    );
  }, [posts, query]);

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

  function remove(id: string) {
    setPicked((prev) => prev.filter((x) => x !== id));
  }

  function toggle(id: string) {
    if (picked.includes(id)) {
      remove(id);
    } else {
      if (maxSelect !== undefined && picked.length >= maxSelect) return;
      setPicked((prev) => [...prev, id]);
    }
  }

  function handleConfirm() {
    onConfirm(picked);
    onClose();
  }

  const isMaxed = maxSelect !== undefined && picked.length >= maxSelect;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:w-[calc(100vw_-_300px)] sm:max-w-[860px] left-[calc(50vw_+_120px)] max-h-[85vh] flex flex-col gap-0 p-0">

        {/* 헤더 */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>포스트 선택</DialogTitle>
          {filterLabel && (
            <p className="text-xs text-zinc-400 mt-0.5">필터: {filterLabel} · {posts.length}개</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* 선택된 포스트 (DnD 순서 변경) */}
          {selectedPosts.length > 0 && (
            <div className="px-4 py-3 border-b bg-zinc-50 shrink-0">
              <p className="text-xs font-medium text-zinc-500 mb-2">
                선택됨 ({selectedPosts.length}개)
                <span className="font-normal ml-1 text-zinc-400">— 드래그로 순서 변경</span>
              </p>
              <div className="max-h-44 overflow-y-auto">
                <DndContext
                  id={dndId}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={picked} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {selectedPosts.map((post, i) => (
                        <SortableSelectedRow key={post.id} post={post} index={i} onRemove={remove} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {/* 검색 */}
          <div className="px-4 py-2.5 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="포스트 검색..."
                className="pl-9"
              />
            </div>
          </div>

          {/* 포스트 그리드 */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredPosts.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-12">검색 결과 없음</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredPosts.map((post) => {
                  const pickIndex = picked.indexOf(post.id);
                  const isPicked = pickIndex !== -1;
                  const disabledAdd = !isPicked && isMaxed;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => toggle(post.id)}
                      disabled={disabledAdd}
                      className={`group text-left rounded-lg overflow-hidden border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isPicked
                          ? "border-zinc-900 ring-2 ring-zinc-900 shadow-md"
                          : "border-zinc-100 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                    >
                      {/* 썸네일 */}
                      <div className="relative aspect-[4/3] bg-zinc-100">
                        {post.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-200" />
                        )}
                        {isPicked ? (
                          /* 선택됨 오버레이: 번호 뱃지 */
                          <div className="absolute inset-0 bg-black/20">
                            <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                              {pickIndex + 1}
                            </span>
                          </div>
                        ) : (
                          /* 미선택 hover 오버레이 */
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-1.5">
                              <Check className="size-4 text-zinc-800" />
                            </div>
                          </div>
                        )}
                      </div>
                      {/* 텍스트 */}
                      <div className="p-2">
                        <p className="text-[11px] font-semibold leading-snug truncate">{post.placeNameKo ?? post.titleKo}</p>
                        <p className="text-[10px] text-zinc-400 leading-snug truncate mt-0.5">{post.titleEn}</p>
                        {((post.topicLabels && post.topicLabels.length > 0) || (post.tagLabels && post.tagLabels.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {post.topicLabels?.slice(0, 2).map((t) => (
                              <LabelBadge
                                key={t.id}
                                text={t.nameEn}
                                background={t.colorHex ?? "#BABABA"}
                                color={t.textColorHex ?? "#FCFCFC"}
                                className="text-[9px]"
                              />
                            ))}
                            {post.tagLabels?.slice(0, 2).map((t) => (
                              <LabelBadge
                                key={t.id}
                                text={t.nameEn}
                                background={t.colorHex ?? "#BABABA"}
                                color={t.textColorHex ?? "#000000"}
                                className="text-[9px]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 */}
        <div className="px-4 py-3 border-t flex justify-between items-center shrink-0">
          <p className="text-sm text-zinc-500">
            {picked.length}개 선택
            {maxSelect !== undefined && (
              <span className="text-zinc-400"> (최대 {maxSelect}개)</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
            <Button size="sm" onClick={handleConfirm}>확인</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
