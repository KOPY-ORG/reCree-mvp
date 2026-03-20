"use client";

import { useState, useTransition, useEffect, useId } from "react";
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
import { GripVertical, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSection,
  updateSection,
  type SectionFormData,
} from "../_actions/home-curation-actions";
import { PostPickerDialog, type PickablePost } from "./PostPickerDialog";
import type { SectionType, ContentType } from "@prisma/client";

type TopicOption = { id: string; nameKo: string; nameEn: string };
type TagOption = { id: string; nameKo: string; name: string };
type TagGroupOption = { group: string; nameEn: string };

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  posts: PickablePost[];
  topics: TopicOption[];
  tags: TagOption[];
  tagGroups: TagGroupOption[];
  editTarget?: {
    id: string;
    titleEn: string;
    contentType: ContentType;
    type: SectionType;
    postIds: string[];
    filterTopicId: string | null;
    filterTagId: string | null;
    filterTagGroup: string | null;
    maxCount: number;
    isActive: boolean;
  };
}

const INITIAL: SectionFormData = {
  titleEn: "",
  contentType: "POST",
  type: "AUTO_NEW",
  postIds: [],
  filterTopicId: "",
  filterTagId: "",
  filterTagGroup: "",
  maxCount: 10,
  isActive: true,
};

// ─── 인라인 선택 포스트 정렬 행 ───────────────────────────────────────────────

function SortablePostRow({
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
      className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-border/50 text-sm"
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0"
      >
        <GripVertical className="size-4" />
      </span>
      <span className="flex-1 truncate">{post.titleEn}</span>
      <button
        type="button"
        onClick={() => onRemove(post.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
        aria-label="제거"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── 메인 다이얼로그 ──────────────────────────────────────────────────────────

export function SectionDialog({
  open,
  onClose,
  posts,
  topics,
  tags,
  tagGroups,
  editTarget,
}: SectionDialogProps) {
  const [form, setForm] = useState<SectionFormData>(INITIAL);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // open/editTarget 변경 시 form 초기화
  useEffect(() => {
    if (open) {
      setForm(
        editTarget
          ? {
              titleEn: editTarget.titleEn,
              contentType: editTarget.contentType,
              type: editTarget.type,
              postIds: editTarget.postIds,
              filterTopicId: editTarget.filterTopicId ?? "",
              filterTagId: editTarget.filterTagId ?? "",
              filterTagGroup: editTarget.filterTagGroup ?? "",
              maxCount: editTarget.maxCount,
              isActive: editTarget.isActive,
            }
          : INITIAL
      );
      setPickerOpen(false);
    }
  }, [open, editTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof SectionFormData>(key: K, value: SectionFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // dnd 순서 변경
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = form.postIds.indexOf(active.id as string);
    const newIdx = form.postIds.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    set("postIds", arrayMove(form.postIds, oldIdx, newIdx));
  }

  function removePost(id: string) {
    set("postIds", form.postIds.filter((x) => x !== id));
  }

  // 선택된 포스트 객체 (순서 유지)
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const selectedPosts = form.postIds
    .map((id) => postMap.get(id))
    .filter((p): p is PickablePost => !!p);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleEn.trim()) return;
    startTransition(async () => {
      if (editTarget) {
        await updateSection(editTarget.id, form);
      } else {
        await createSection(form);
      }
      onClose();
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editTarget ? "섹션 수정" : "섹션 추가"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* 콘텐츠 유형 선택 */}
            <div className="space-y-1.5">
              <Label>콘텐츠 유형</Label>
              <div className="flex gap-2">
                {(["POST", "RECREESHOT"] as ContentType[]).map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        contentType: ct,
                        postIds: [],
                        ...(ct === "RECREESHOT" && prev.type === "MANUAL"
                          ? { type: "AUTO_NEW" as const }
                          : {}),
                      }));
                    }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      form.contentType === ct
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-500 border-border hover:border-zinc-400"
                    }`}
                  >
                    {ct === "POST" ? "포스트" : "recreeshot"}
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 + 타입 (한 줄) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>제목 *</Label>
                <Input
                  value={form.titleEn}
                  onChange={(e) => set("titleEn", e.target.value)}
                  placeholder="e.g. Trending Now"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>섹션 타입</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => set("type", v as SectionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {form.contentType === "POST" && (
                      <SelectItem value="MANUAL">MANUAL</SelectItem>
                    )}
                    <SelectItem value="AUTO_NEW">AUTO_NEW (최신순)</SelectItem>
                    <SelectItem value="AUTO_HOT">AUTO_HOT (인기순)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 포스트 순서 설정: MANUAL은 필수, AUTO는 선택(고정 순서 적용) */}
            {form.contentType === "POST" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {form.type === "MANUAL" ? "선택된 포스트" : "고정 포스트 순서"}
                    {" "}
                    <span className="text-muted-foreground font-normal">
                      ({form.postIds.length}개
                      {form.type !== "MANUAL" && form.postIds.length === 0 && " · 비어있으면 자동 정렬"}
                      )
                    </span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <Plus className="size-3" />
                    포스트 추가
                  </Button>
                </div>

                {selectedPosts.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setPickerOpen(true)}
                  >
                    {form.type === "MANUAL"
                      ? "포스트를 선택해주세요"
                      : "포스트를 추가하면 해당 순서로 고정됩니다"}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-2 space-y-1.5 max-h-64 overflow-y-auto">
                    <DndContext
                      id={dndId}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={form.postIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedPosts.map((post) => (
                          <SortablePostRow
                            key={post.id}
                            post={post}
                            onRemove={removePost}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {/* AUTO: maxCount + 필터 */}
            {(form.contentType === "RECREESHOT" || form.type !== "MANUAL") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>토픽 필터</Label>
                    <Select
                      value={form.filterTopicId || "none"}
                      onValueChange={(v) => set("filterTopicId", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">전체</SelectItem>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nameKo} ({t.nameEn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>태그 필터</Label>
                    <Select
                      value={
                        form.filterTagGroup
                          ? `group:${form.filterTagGroup}`
                          : form.filterTagId || "none"
                      }
                      onValueChange={(v) => {
                        if (v === "none") {
                          set("filterTagId", "");
                          set("filterTagGroup", "");
                        } else if (v.startsWith("group:")) {
                          set("filterTagGroup", v.slice(6));
                          set("filterTagId", "");
                        } else {
                          set("filterTagId", v);
                          set("filterTagGroup", "");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">전체</SelectItem>
                        {tagGroups.map((g) => (
                          <SelectItem key={`group:${g.group}`} value={`group:${g.group}`}>
                            ▸ {g.nameEn} 전체
                          </SelectItem>
                        ))}
                        {tags.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nameKo} ({t.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>최대 표시 수</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.maxCount}
                    onChange={(e) => set("maxCount", Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              </>
            )}

            {/* 하단: 활성화 + 버튼 */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="section-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => set("isActive", v)}
                />
                <Label htmlFor="section-active">활성화</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "저장 중..." : editTarget ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 포스트 추가 다이얼로그 — 미선택 포스트만 표시, 클릭 시 추가 */}
      <PostPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        posts={posts}
        selectedIds={form.postIds}
        onConfirm={(ids) => set("postIds", ids)}
      />
    </>
  );
}
