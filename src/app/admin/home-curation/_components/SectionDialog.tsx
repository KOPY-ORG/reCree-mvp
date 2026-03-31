"use client";

import { useState, useTransition, useEffect, useId, useMemo } from "react";
import Image from "next/image";
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
import { GripVertical, X, Plus, Minus } from "lucide-react";
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
import { isExternalImage } from "@/lib/image";
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
  type: "MANUAL",
  postIds: [],
  filterTopicId: "",
  filterTagId: "",
  filterTagGroup: "",
  maxCount: 20,
  isActive: true,
};

// 콘텐츠 타입별 섹션 타입 옵션
const POST_TYPE_OPTIONS: { value: SectionType; label: string; description: string }[] = [
  { value: "MANUAL",   label: "수동 선택",   description: "포스트를 직접 골라 순서를 지정합니다" },
  { value: "AUTO_NEW", label: "최신순 자동", description: "최근 등록된 포스트를 자동으로 표시합니다" },
  { value: "AUTO_HOT", label: "인기순 자동", description: "조회수가 높은 포스트를 자동으로 표시합니다" },
];

const RECREESHOT_TYPE_OPTIONS: { value: SectionType; label: string; description: string }[] = [
  { value: "AUTO_NEW", label: "최신순 자동", description: "최근 업로드된 recreeshot을 자동으로 표시합니다" },
  { value: "AUTO_HOT", label: "인기순 자동", description: "좋아요가 많은 recreeshot을 자동으로 표시합니다" },
];

// ─── 포스트 행 (드래그 가능) ─────────────────────────────────────────────────

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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 shrink-0 transition-colors"
      >
        <GripVertical className="size-4" />
      </span>
      <div className="relative size-9 rounded overflow-hidden shrink-0 bg-zinc-100">
        {post.thumbnailUrl && (
          <Image
            src={post.thumbnailUrl}
            alt=""
            fill
            unoptimized={isExternalImage(post.thumbnailUrl)}
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{post.placeNameKo ?? post.titleKo}</p>
        <p className="text-xs text-zinc-400 truncate">{post.titleEn}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(post.id)}
        className="text-zinc-300 hover:text-destructive shrink-0 transition-colors"
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

  function handleTypeChange(type: SectionType) {
    setForm((prev) => ({
      ...prev,
      type,
      // 자동 타입으로 바꾸면 수동 선택 포스트 초기화
      ...(type !== "MANUAL" ? { postIds: [] } : {}),
    }));
  }

  function handleContentTypeChange(ct: ContentType) {
    setForm((prev) => ({
      ...prev,
      contentType: ct,
      postIds: [],
      type: ct === "RECREESHOT" && prev.type === "MANUAL" ? "AUTO_NEW" : prev.type,
    }));
  }

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

  const filteredPosts = useMemo(() => {
    const { filterTopicId, filterTagId, filterTagGroup } = form;
    if (!filterTopicId && !filterTagId && !filterTagGroup) return posts;
    return posts.filter((p) => {
      if (filterTopicId && !p.allTopicIds?.includes(filterTopicId)) return false;
      if (filterTagId && !p.tagIds?.includes(filterTagId)) return false;
      if (filterTagGroup && !p.tagGroups?.includes(filterTagGroup)) return false;
      return true;
    });
  }, [posts, form.filterTopicId, form.filterTagId, form.filterTagGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickerFilterLabel = useMemo(() => {
    if (form.filterTopicId) {
      const t = topics.find((t) => t.id === form.filterTopicId);
      return t ? `${t.nameKo} (${t.nameEn})` : undefined;
    }
    if (form.filterTagGroup) {
      const g = tagGroups.find((g) => g.group === form.filterTagGroup);
      return g ? `${g.nameEn} 전체` : undefined;
    }
    if (form.filterTagId) {
      const t = tags.find((t) => t.id === form.filterTagId);
      return t ? `${t.nameKo} (${t.name})` : undefined;
    }
    return undefined;
  }, [form.filterTopicId, form.filterTagId, form.filterTagGroup, topics, tags, tagGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const postMap = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const selectedPosts = useMemo(
    () => form.postIds.map((id) => postMap.get(id)).filter((p): p is PickablePost => !!p),
    [form.postIds, postMap]
  );

  const typeOptions = form.contentType === "POST" ? POST_TYPE_OPTIONS : RECREESHOT_TYPE_OPTIONS;
  const isManual = form.type === "MANUAL" && form.contentType === "POST";
  const isAuto = form.type !== "MANUAL";

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
        <DialogContent className="sm:w-[calc(100vw_-_300px)] sm:max-w-[900px] left-[calc(50vw_+_120px)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "섹션 수정" : "섹션 추가"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">

            {/* ① 기본 정보 */}
            <div className="space-y-3">
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
                <Label>콘텐츠 유형</Label>
                <div className="flex gap-2">
                  {(["POST", "RECREESHOT"] as ContentType[]).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => handleContentTypeChange(ct)}
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
            </div>

            {/* ② 섹션 타입 */}
            <div className="space-y-1.5">
              <Label>섹션 타입</Label>
              <div className={`grid gap-2 ${typeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      form.type === opt.value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className={`text-xs mt-1 leading-snug ${form.type === opt.value ? "text-zinc-400" : "text-zinc-400"}`}>
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ③ 포스트 설정 (MANUAL만) */}
            {isManual && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>포스트 선택</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      <span className={selectedPosts.length >= 20 ? "text-zinc-900 font-semibold" : "text-zinc-600 font-medium"}>
                        {selectedPosts.length}
                      </span>
                      <span> / 20</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      className="gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      포스트 추가
                    </Button>
                  </div>
                </div>

                {selectedPosts.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full rounded-lg border-2 border-dashed border-zinc-200 py-8 text-sm text-zinc-400 hover:border-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    클릭하여 포스트를 선택해주세요
                  </button>
                ) : (
                  <div className="rounded-lg border border-zinc-100 bg-white overflow-hidden max-h-56 overflow-y-auto">
                    <DndContext
                      id={dndId}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={form.postIds} strategy={verticalListSortingStrategy}>
                        {selectedPosts.map((post) => (
                          <SortablePostRow key={post.id} post={post} onRemove={removePost} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {/* ④ 노출 설정 (AUTO or RECREESHOT) */}
            {isAuto && (
              <div className="space-y-2">
                <Label>노출 설정</Label>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-500">토픽 필터</p>
                      <Select
                        value={form.filterTopicId || "none"}
                        onValueChange={(v) => set("filterTopicId", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="bg-white">
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
                      <p className="text-xs text-zinc-500">태그 필터</p>
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
                        <SelectTrigger className="bg-white">
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
                    {/* 표시 개수 스테퍼 */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-500">표시 개수 <span className="text-zinc-400">(최대 20개)</span></p>
                      <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => set("maxCount", Math.max(1, form.maxCount - 1))}
                          disabled={form.maxCount <= 1}
                          className="px-3 h-full text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={form.maxCount}
                          onChange={(e) => {
                            const v = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                            set("maxCount", v);
                          }}
                          className="flex-1 text-center text-sm font-semibold border-x border-zinc-200 h-full focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => set("maxCount", Math.min(20, form.maxCount + 1))}
                          disabled={form.maxCount >= 20}
                          className="px-3 h-full text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 하단 */}
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
                <Button type="submit" disabled={isPending || (isManual && selectedPosts.length === 0)}>
                  {isPending ? "저장 중..." : editTarget ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PostPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        posts={filteredPosts}
        selectedIds={form.postIds}
        onConfirm={(ids) => set("postIds", ids)}
        maxSelect={20}
        filterLabel={pickerFilterLabel}
      />
    </>
  );
}
