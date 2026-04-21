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
import { GripVertical, X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
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
import { isExternalImage } from "@/lib/image";
import {
  createSection,
  updateSection,
  type SectionFormData,
} from "../_actions/home-curation-actions";
import { PostPickerDialog, type PickablePost } from "./PostPickerDialog";
import type { SectionType, ContentType } from "@prisma/client";

type TopicOption = {
  id: string;
  nameKo: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  colorHex: string | null;
  textColorHex: string | null;
};
type TagOption = { id: string; nameKo: string; name: string; group: string };
type TagGroupOption = { group: string; nameEn: string; colorHex: string; textColorHex: string };

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

// ─── 필터 선택 다이얼로그 ─────────────────────────────────────────────────────

type TopicNode = {
  id: string;
  label: string;
  colorHex: string | null;
  textColorHex: string | null;
  children: TopicNode[];
};

type TagGroupNode = {
  group: string;
  label: string;
  colorHex: string;
  textColorHex: string;
  tags: { id: string; label: string }[];
};

function TopicFilterPickerDialog({
  label,
  roots,
  value,
  onChange,
}: {
  label: string;
  roots: TopicNode[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function select(id: string) {
    onChange(id === value ? "" : id);
    setOpen(false);
  }

  function findNode(nodes: TopicNode[], id: string): TopicNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const selectedNode = value ? findNode(roots, value) : null;

  function chipCls(isSelected: boolean) {
    return `pill-badge border text-sm transition-all ${
      isSelected ? "ring-2 ring-offset-1 border-transparent" : "text-zinc-500 border-zinc-200 hover:border-zinc-500"
    }`;
  }

  // 선택 가능한 일반 칩 — 클릭 시 선택 + 다이얼로그 닫힘
  function LeafChip({ node, fallback }: { node: TopicNode; fallback: string | null }) {
    const isSel = value === node.id;
    return (
      <button
        type="button"
        onClick={() => select(node.id)}
        style={isSel ? { background: node.colorHex ?? fallback ?? "#3f3f46", color: node.textColorHex ?? "#fff" } : {}}
        className={chipCls(isSel)}
      >
        {node.label}
      </button>
    );
  }

  // 확장 가능한 칩 (하위 계층 있음) — 클릭 시 펼치기/접기
  function ExpandableChip({ node, fallback }: { node: TopicNode; fallback: string | null }) {
    const isSel = value === node.id;
    const isExp = expandedId === node.id;
    return (
      <button
        type="button"
        onClick={() => setExpandedId(isExp ? null : node.id)}
        style={isSel ? { background: node.colorHex ?? fallback ?? "#3f3f46", color: node.textColorHex ?? "#fff" } : {}}
        className={`${chipCls(isSel)} gap-1`}
      >
        {node.label}
        {isExp ? <ChevronUp className="size-3 opacity-70" /> : <ChevronDown className="size-3 opacity-70" />}
      </button>
    );
  }

  // "All [X]" 칩 — 클릭 시 해당 노드 선택 + 다이얼로그 닫힘
  function AllChip({ node, fallback }: { node: TopicNode; fallback: string | null }) {
    const isSel = value === node.id;
    return (
      <button
        type="button"
        onClick={() => select(node.id)}
        style={isSel ? { background: node.colorHex ?? fallback ?? "#3f3f46", color: node.textColorHex ?? "#fff" } : {}}
        className={`${chipCls(isSel)} font-semibold`}
      >
        All {node.label}
      </button>
    );
  }

  // 확장 박스: 하위 멤버/항목 나열
  function ExpandedBox({ node, fallback }: { node: TopicNode; fallback: string | null }) {
    return (
      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 mt-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: node.colorHex ?? fallback ?? "#BABABA" }} />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{node.label}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AllChip node={node} fallback={fallback} />
          {node.children.map((child) => (
            <LeafChip key={child.id} node={child} fallback={node.colorHex ?? fallback} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 h-9 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 transition-colors text-left"
      >
        {selectedNode ? (
          <span
            className="pill-badge text-xs"
            style={{ background: selectedNode.colorHex ?? "#BABABA", color: selectedNode.textColorHex ?? "#fff" }}
          >
            {selectedNode.label}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">전체</span>
        )}
        <ChevronDown className="size-3.5 text-zinc-400 ml-auto shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setExpandedId(null); }}>
        <DialogContent className="sm:w-[calc(100vw_-_300px)] sm:max-w-[640px] left-[calc(50vw_+_120px)] max-h-[75vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 [--pill-py:0.3rem]">

            {/* 전체 */}
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`pill-badge border text-sm transition-colors ${
                !value ? "bg-zinc-900 text-white border-zinc-900" : "text-zinc-500 border-zinc-200 hover:border-zinc-500"
              }`}
            >
              전체
            </button>

            {roots.map((root) => (
              <div key={root.id} className="space-y-3">

                {/* L0 섹션 헤더 */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: root.colorHex ?? "#BABABA" }} />
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{root.label}</p>
                </div>

                <div className="pl-4 space-y-3">
                  {/* All L0 */}
                  <AllChip node={root} fallback={null} />

                  {root.children.length > 0 && (
                    <div className="space-y-3">
                      {root.children.map((l1) => {
                        if (l1.children.length === 0) {
                          // L1이 leaf → 칩으로 표시
                          return <LeafChip key={l1.id} node={l1} fallback={root.colorHex} />;
                        }

                        // L1이 L2 자식을 가짐 → L1을 섹션 레이블로, L2를 칩으로
                        const expandedL2 = expandedId
                          ? l1.children.find((l2) => l2.id === expandedId) ?? null
                          : null;

                        return (
                          <div key={l1.id} className="space-y-2">
                            {/* L1 섹션 레이블 */}
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                              {l1.label}
                            </p>
                            {/* All L1 + L2 칩들 */}
                            <div className="flex flex-wrap gap-1.5">
                              <AllChip node={l1} fallback={l1.colorHex ?? root.colorHex} />
                              {l1.children.map((l2) =>
                                l2.children.length > 0 ? (
                                  <ExpandableChip
                                    key={l2.id}
                                    node={l2}
                                    fallback={l2.colorHex ?? l1.colorHex ?? root.colorHex}
                                  />
                                ) : (
                                  <LeafChip
                                    key={l2.id}
                                    node={l2}
                                    fallback={l2.colorHex ?? l1.colorHex ?? root.colorHex}
                                  />
                                )
                              )}
                            </div>
                            {/* 확장된 L2의 L3 자식 (멤버 등) */}
                            {expandedL2 && (
                              <ExpandedBox
                                node={expandedL2}
                                fallback={expandedL2.colorHex ?? l1.colorHex ?? root.colorHex}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagFilterPickerDialog({
  label,
  groups,
  tagValue,
  groupValue,
  onChange,
}: {
  label: string;
  groups: TagGroupNode[];
  tagValue: string;
  groupValue: string;
  onChange: (tagId: string, groupName: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedTag = tagValue ? groups.flatMap((g) => g.tags).find((t) => t.id === tagValue) : null;
  const selectedTagGroup = tagValue ? groups.find((g) => g.tags.some((t) => t.id === tagValue)) : null;
  const selectedGroupNode = groupValue ? groups.find((g) => g.group === groupValue) : null;
  const displayGroup = selectedGroupNode ?? selectedTagGroup ?? null;
  const displayLabel = selectedTag?.label ?? (selectedGroupNode ? `All ${selectedGroupNode.label}` : null);
  const displayColor = displayGroup?.colorHex ?? null;
  const displayTextColor = displayGroup?.textColorHex ?? null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 h-9 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 transition-colors text-left"
      >
        {displayLabel ? (
          <span
            className="pill-badge text-xs"
            style={{ background: displayColor ?? "#BABABA", color: displayTextColor ?? "#fff" }}
          >
            {displayLabel}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">전체</span>
        )}
        <ChevronDown className="size-3.5 text-zinc-400 ml-auto shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[calc(100vw_-_300px)] sm:max-w-[640px] left-[calc(50vw_+_120px)] max-h-[70vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [--pill-py:0.3rem]">
            <button
              type="button"
              onClick={() => { onChange("", ""); setOpen(false); }}
              className={`pill-badge border text-sm transition-colors ${
                !tagValue && !groupValue ? "bg-zinc-900 text-white border-zinc-900" : "text-zinc-500 border-zinc-200 hover:border-zinc-500"
              }`}
            >
              전체
            </button>
            {groups.map((g) => (
              <div key={g.group} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: g.colorHex }} />
                  <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{g.label}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {/* All group */}
                  <button
                    type="button"
                    onClick={() => { onChange("", g.group); setOpen(false); }}
                    style={groupValue === g.group && !tagValue
                      ? { background: g.colorHex, color: g.textColorHex }
                      : {}}
                    className={`pill-badge border text-sm font-semibold transition-all ${
                      groupValue === g.group && !tagValue ? "ring-2 ring-offset-1 border-transparent" : "text-zinc-500 border-zinc-200 hover:border-zinc-500"
                    }`}
                  >
                    All {g.label}
                  </button>
                  {g.tags.map((t) => {
                    const isSelected = tagValue === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { onChange(t.id, g.group); setOpen(false); }}
                        style={isSelected ? { background: g.colorHex, color: g.textColorHex } : {}}
                        className={`pill-badge border text-sm transition-all ${
                          isSelected ? "ring-2 ring-offset-1 border-transparent" : "text-zinc-500 border-zinc-200 hover:border-zinc-500"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [open, editTarget]);

  function set<K extends keyof SectionFormData>(key: K, value: SectionFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type: SectionType) {
    setForm((prev) => ({ ...prev, type }));
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
  }, [form.filterTopicId, form.filterTagId, form.filterTagGroup, topics, tags, tagGroups]);

  const postMap = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const selectedPosts = useMemo(
    () => form.postIds.map((id) => postMap.get(id)).filter((p): p is PickablePost => !!p),
    [form.postIds, postMap]
  );

  // 토픽 필터 트리 (L0 → L1 → L2 재귀)
  const topicGroups = useMemo((): TopicNode[] => {
    function buildChildren(parentId: string, parentColorHex: string | null, parentTextColorHex: string | null): TopicNode[] {
      return topics
        .filter((t) => t.parentId === parentId)
        .map((t) => {
          const colorHex = t.colorHex ?? parentColorHex;
          const textColorHex = t.textColorHex ?? parentTextColorHex;
          return {
            id: t.id,
            label: t.nameEn,
            colorHex,
            textColorHex,
            children: buildChildren(t.id, colorHex, textColorHex),
          };
        });
    }
    return topics
      .filter((t) => t.level === 0)
      .map((root) => ({
        id: root.id,
        label: root.nameEn,
        colorHex: root.colorHex ?? null,
        textColorHex: root.textColorHex ?? null,
        children: buildChildren(root.id, root.colorHex ?? null, root.textColorHex ?? null),
      }));
  }, [topics]);

  // 태그 필터 그룹 (tagGroup → 개별 tags)
  const tagGroupNodes = useMemo((): TagGroupNode[] => {
    return tagGroups.map((g) => ({
      group: g.group,
      label: g.nameEn,
      colorHex: g.colorHex,
      textColorHex: g.textColorHex,
      tags: tags
        .filter((t) => t.group === g.group)
        .map((t) => ({ id: t.id, label: t.name })),
    }));
  }, [tagGroups, tags]);

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
        <DialogContent className="sm:w-[calc(100vw_-_300px)] sm:max-w-[900px] left-[calc(50vw_+_120px)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{editTarget ? "섹션 수정" : "섹션 추가"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pt-1 pb-2 space-y-5">

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
                    <p className="text-xs mt-1 leading-snug text-zinc-400">
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
                <div className="rounded-lg bg-zinc-50 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <TopicFilterPickerDialog
                      label="토픽 필터"
                      roots={topicGroups}
                      value={form.filterTopicId || ""}
                      onChange={(v) => set("filterTopicId", v)}
                    />
                    <TagFilterPickerDialog
                      label="태그 필터"
                      groups={tagGroupNodes}
                      tagValue={form.filterTagId || ""}
                      groupValue={form.filterTagGroup || ""}
                      onChange={(tagId, group) => {
                        set("filterTagId", tagId);
                        set("filterTagGroup", group);
                      }}
                    />
                  </div>
                  {/* 표시 개수 스테퍼 */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
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
                        className="w-10 text-center text-sm font-semibold border-x border-zinc-200 h-full focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
            )}

          </div>
            {/* 하단 */}
            <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
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
