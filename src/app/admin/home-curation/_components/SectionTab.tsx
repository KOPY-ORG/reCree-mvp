"use client";

import { useState, useTransition, useId, useEffect } from "react";
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
import { GripVertical, Pencil, Trash2, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteSection,
  reorderSections,
  toggleSectionActive,
  toggleHomeSection,
} from "../_actions/home-curation-actions";
import { SectionDialog } from "./SectionDialog";
import type { PickablePost } from "./PostPickerDialog";
import type { SectionType, ContentType } from "@prisma/client";

type TopicOption = { id: string; nameKo: string; nameEn: string; level: number; parentId: string | null; colorHex: string | null; textColorHex: string | null };
type TagOption = { id: string; nameKo: string; name: string; group: string };
type TagGroupOption = { group: string; nameEn: string; colorHex: string; textColorHex: string };
type RegionOption = { label: string; slug: string };

export type SectionRow = {
  id: string;
  titleEn: string;
  contentType: ContentType;
  type: SectionType;
  postIds: string[];
  filterTopicId: string | null;
  filterTagId: string | null;
  filterTagGroup: string | null;
  filterRegion: string | null;
  maxCount: number;
  order: number;
  isActive: boolean;
  showOnHome: boolean;
};

function SortableSectionRow({
  section,
  topics,
  tags,
  tagGroups,
  onEdit,
  onRemove,
  onToggle,
  onSetHome,
}: {
  section: SectionRow;
  topics: TopicOption[];
  tags: TagOption[];
  tagGroups: TagGroupOption[];
  onEdit: (s: SectionRow) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
  onSetHome: (id: string, v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function getDescription() {
    const filterLabel = section.filterTopicId
      ? (topics.find((t) => t.id === section.filterTopicId)?.nameKo ?? null)
      : section.filterTagGroup
      ? (tagGroups.find((g) => g.group === section.filterTagGroup)?.nameEn ?? null)
      : section.filterTagId
      ? (tags.find((t) => t.id === section.filterTagId)?.nameKo ?? null)
      : null;

    if (section.contentType === "RECREESHOT") {
      const parts = ["recreeshot"];
      if (filterLabel) parts.push(filterLabel);
      parts.push(`최대 ${section.maxCount}개`);
      return parts.join(" · ");
    }
    if (section.type === "MANUAL") {
      return `수동 선택 · 포스트 ${section.postIds.length}개`;
    }
    const typeLabel = section.type === "AUTO_NEW" ? "최신순 자동" : "인기순 자동";
    const parts = [typeLabel, filterLabel ?? "전체", `최대 ${section.maxCount}개`];
    return parts.join(" · ");
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/row flex items-center gap-3 border-b border-zinc-100 last:border-b-0 py-3 px-4 transition-colors hover:bg-zinc-50"
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
      >
        <GripVertical className="size-4" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{section.titleEn}</p>
          {section.contentType === "RECREESHOT" && (
            <Camera className="size-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{getDescription()}</p>
      </div>

      <Switch
        checked={section.showOnHome}
        onCheckedChange={(v) => onSetHome(section.id, v)}
        className="shrink-0 data-[state=checked]:bg-brand"
      />

      <Switch
        checked={section.isActive}
        onCheckedChange={(v) => onToggle(section.id, v)}
        className="shrink-0"
      />

      <button
        type="button"
        onClick={() => onEdit(section)}
        className="opacity-30 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
        aria-label="수정"
      >
        <Pencil className="size-4" />
      </button>

      <button
        type="button"
        onClick={() => onRemove(section.id)}
        className="opacity-30 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
        aria-label="삭제"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function SectionTab({
  initialSections,
  posts,
  topics,
  tags,
  tagGroups,
  regions,
}: {
  initialSections: SectionRow[];
  posts: PickablePost[];
  topics: TopicOption[];
  tags: TagOption[];
  tagGroups: TagGroupOption[];
  regions: RegionOption[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SectionRow | null>(null);
  const [, startTransition] = useTransition();
  const dndId = useId();

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(sections, oldIdx, newIdx);
    setSections(next);
    startTransition(() => reorderSections(next.map((s) => s.id)));
  }

  function handleToggle(id: string, isActive: boolean) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive } : s))
    );
    startTransition(() => toggleSectionActive(id, isActive));
  }

  function handleSetHome(id: string, showOnHome: boolean) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showOnHome } : s))
    );
    startTransition(() => toggleHomeSection(id, showOnHome));
  }

  function handleRemove(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteSection(id));
  }

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(section: SectionRow) {
    setEditTarget(section);
    setDialogOpen(true);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          드래그로 순서를 변경합니다.
        </p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          섹션 추가
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
          큐레이션 섹션이 없습니다.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-sm bg-white">
          {/* 헤더 */}
          <div className="bg-zinc-50 border-b border-zinc-100 flex items-center gap-3 px-4 py-3">
            <span className="size-4 shrink-0" />
            <span className="flex-1 text-xs font-medium text-muted-foreground">섹션</span>
            <span className="shrink-0 w-11 text-center text-xs font-medium text-muted-foreground">홈</span>
            <span className="shrink-0 w-11 text-center text-xs font-medium text-muted-foreground">활성</span>
            <span className="size-4 shrink-0" />
            <span className="size-4 shrink-0" />
          </div>
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  topics={topics}
                  tags={tags}
                  tagGroups={tagGroups}
                  onEdit={openEdit}
                  onRemove={handleRemove}
                  onToggle={handleToggle}
                  onSetHome={handleSetHome}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <SectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        posts={posts}
        topics={topics}
        tags={tags}
        tagGroups={tagGroups}
        regions={regions}
        editTarget={
          editTarget
            ? {
                id: editTarget.id,
                titleEn: editTarget.titleEn,
                contentType: editTarget.contentType,
                type: editTarget.type,
                postIds: editTarget.postIds,
                filterTopicId: editTarget.filterTopicId,
                filterTagId: editTarget.filterTagId,
                filterTagGroup: editTarget.filterTagGroup,
                filterRegion: editTarget.filterRegion,
                maxCount: editTarget.maxCount,
                isActive: editTarget.isActive,
              }
            : undefined
        }
      />
    </div>
  );
}
