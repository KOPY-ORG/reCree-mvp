"use client";

import { useState, useTransition, useId } from "react";
import { Plus, Pencil, Search, Trash2, GripVertical } from "lucide-react";
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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SortableTagList, ColorLabel, type TagItem, type TagGroupConfigItem } from "./SortableTagList";
import { TagDialog } from "./TagDialog";
import { TagGroupConfigDialog } from "./TagGroupConfigDialog";
import {
  deleteTagGroup,
  reorderTagGroups,
  type TagGroupConfigCreated,
  type TagGroupConfigData,
  type TagSavedData,
} from "../actions";

// ─── 유틸: effective color 계산 ───────────────────────────────────────────────

const DEFAULT_GROUP_COLOR: Pick<TagGroupConfigItem, "colorHex" | "colorHex2" | "gradientDir" | "gradientStop" | "textColorHex"> = {
  colorHex: "#C6FD09",
  colorHex2: null,
  gradientDir: "to bottom",
  gradientStop: 150,
  textColorHex: "#000000",
};

function computeEffective(
  tag: Pick<TagItem, "colorHex" | "colorHex2" | "textColorHex">,
  gc: Pick<TagGroupConfigItem, "colorHex" | "colorHex2" | "gradientDir" | "gradientStop" | "textColorHex">
) {
  return {
    effectiveColorHex: tag.colorHex ?? gc.colorHex,
    effectiveColorHex2: tag.colorHex !== null ? tag.colorHex2 : gc.colorHex2,
    effectiveGradientDir: gc.gradientDir,
    effectiveGradientStop: gc.gradientStop,
    effectiveTextColorHex: tag.textColorHex ?? gc.textColorHex,
  };
}

// ─── GroupColumn ──────────────────────────────────────────────────────────────

function GroupColumn({
  groupConfig,
  tags,
  onEdit,
  onAdd,
  onEditGroupConfig,
  onDeleteGroup,
  hideInactive,
  searchQuery,
  dragHandleProps,
  isDragging,
}: {
  groupConfig: TagGroupConfigItem;
  tags: TagItem[];
  onEdit: (tag: TagItem) => void;
  onAdd: (group: string) => void;
  onEditGroupConfig: (config: TagGroupConfigItem) => void;
  onDeleteGroup: (group: string) => void;
  hideInactive?: boolean;
  searchQuery?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  isDragging?: boolean;
}) {
  const q = searchQuery?.toLowerCase() ?? "";
  const filteredTags = q
    ? tags.filter(
        (t) =>
          t.nameKo.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.slug.includes(q)
      )
    : tags;

  const canDelete = tags.length === 0;

  return (
    <div
      className={`rounded-xl overflow-hidden bg-white shadow-sm transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-zinc-200" : ""
      }`}
    >
      {/* 컬럼 헤더 */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-1.5 bg-muted/30">
        <span
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0 select-none"
          title="드래그해서 순서 변경"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        <ColorLabel
          name={groupConfig.nameEn || groupConfig.group}
          colorHex={groupConfig.colorHex}
          colorHex2={groupConfig.colorHex2}
          gradientDir={groupConfig.gradientDir}
          gradientStop={groupConfig.gradientStop}
          textColorHex={groupConfig.textColorHex}
          className="text-sm px-3 py-1"
        />
        <span className="flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">{tags.length}</span>
        <button
          type="button"
          onClick={() => onEditGroupConfig(groupConfig)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="그룹 색상·이름 편집"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => canDelete && onDeleteGroup(groupConfig.group)}
          disabled={!canDelete}
          className={`p-1 rounded transition-colors shrink-0 ${
            canDelete
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          title={canDelete ? "그룹 삭제" : "태그가 있으면 삭제 불가"}
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onAdd(groupConfig.group)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="새 태그 추가"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* 태그 목록 */}
      <div>
        {filteredTags.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">태그 없음</p>
        ) : (
          <SortableTagList items={filteredTags} onEdit={onEdit} hideInactive={hideInactive} />
        )}
      </div>
    </div>
  );
}

// ─── SortableGroupColumn ──────────────────────────────────────────────────────

function SortableGroupColumn(props: React.ComponentProps<typeof GroupColumn>) {
  const { groupConfig } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupConfig.group,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <GroupColumn
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── TagsTabContent ───────────────────────────────────────────────────────────

interface TagsTabContentProps {
  tagsByGroup: Record<string, TagItem[]>;
  groupConfigs: TagGroupConfigItem[];
}

export function TagsTabContent({ tagsByGroup: initialTagsByGroup, groupConfigs: initialGroupConfigs }: TagsTabContentProps) {
  const [orderedConfigs, setOrderedConfigs] = useState(initialGroupConfigs);
  const [tagsByGroup, setTagsByGroup] = useState(initialTagsByGroup);
  const [, startTransition] = useTransition();
  const dndId = useId();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [defaultGroup, setDefaultGroup] = useState<string | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [groupConfigDialogOpen, setGroupConfigDialogOpen] = useState(false);
  const [groupConfigDialogMode, setGroupConfigDialogMode] = useState<"create" | "edit">("edit");
  const [editingGroupConfig, setEditingGroupConfig] = useState<TagGroupConfigItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const groupOptions = orderedConfigs.map((c) => ({
    value: c.group,
    label: c.nameEn || c.group,
  }));

  // ─── Tag 이벤트 핸들러 ────────────────────────────────────────────────────

  function handleTagSaved(raw: TagSavedData) {
    const gc = orderedConfigs.find((c) => c.group === raw.group) ?? DEFAULT_GROUP_COLOR as TagGroupConfigItem;
    const effective = computeEffective(raw, gc);
    const tagItem: TagItem = { ...raw, ...effective };

    setTagsByGroup((prev) => {
      const next = { ...prev };
      // 기존 그룹에서 제거 (수정 시 그룹 변경 대응)
      for (const g of Object.keys(next)) {
        next[g] = next[g].filter((t) => t.id !== raw.id);
      }
      // 새 그룹에 추가 (sortOrder 순 유지)
      const group = raw.group;
      const existing = next[group] ?? [];
      const inserted = [...existing, tagItem].sort((a, b) => a.sortOrder - b.sortOrder);
      next[group] = inserted;
      return next;
    });
  }

  function handleTagDeleted(id: string) {
    setTagsByGroup((prev) => {
      const next = { ...prev };
      for (const g of Object.keys(next)) {
        next[g] = next[g].filter((t) => t.id !== id);
      }
      return next;
    });
  }

  // ─── Group 이벤트 핸들러 ──────────────────────────────────────────────────

  function handleGroupCreated(created: TagGroupConfigCreated) {
    setOrderedConfigs((prev) => [...prev, created]);
  }

  function handleGroupUpdated(updated: TagGroupConfigData) {
    // orderedConfigs 업데이트
    setOrderedConfigs((prev) =>
      prev.map((c) => (c.group === updated.group ? updated : c))
    );
    // 해당 그룹 태그들의 effective color 재계산
    setTagsByGroup((prev) => {
      const tags = prev[updated.group];
      if (!tags) return prev;
      return {
        ...prev,
        [updated.group]: tags.map((tag) => ({
          ...tag,
          ...computeEffective(tag, updated),
        })),
      };
    });
  }

  function handleDeleteGroup(group: string) {
    const config = orderedConfigs.find((c) => c.group === group);
    if (!confirm(`"${config?.nameEn || group}" 그룹을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const result = await deleteTagGroup(group);
      if (result.error) {
        toast.error(result.error);
      } else {
        setOrderedConfigs((prev) => prev.filter((c) => c.group !== group));
        toast.success("그룹이 삭제되었습니다.");
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedConfigs.findIndex((c) => c.group === active.id);
    const newIndex = orderedConfigs.findIndex((c) => c.group === over.id);
    const next = arrayMove(orderedConfigs, oldIndex, newIndex);

    setOrderedConfigs(next);
    startTransition(() => {
      reorderTagGroups(next.map((c) => c.group));
    });
  }

  // ─── Dialog 열기/닫기 ────────────────────────────────────────────────────

  function openCreate(group: string) {
    setEditingTag(null);
    setDefaultGroup(group);
    setDialogOpen(true);
  }

  function openEdit(tag: TagItem) {
    setEditingTag(tag);
    setDefaultGroup(null);
    setDialogOpen(true);
  }

  function openCreateAll() {
    setEditingTag(null);
    setDefaultGroup(orderedConfigs[0]?.group ?? null);
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingTag(null);
    setDefaultGroup(null);
  }

  function openGroupConfigEdit(config: TagGroupConfigItem) {
    setGroupConfigDialogMode("edit");
    setEditingGroupConfig(config);
    setGroupConfigDialogOpen(true);
  }

  function openGroupConfigCreate() {
    setGroupConfigDialogMode("create");
    setEditingGroupConfig(null);
    setGroupConfigDialogOpen(true);
  }

  function handleGroupConfigClose() {
    setGroupConfigDialogOpen(false);
    setEditingGroupConfig(null);
  }

  const totalCount = orderedConfigs.reduce((acc, c) => acc + (tagsByGroup[c.group]?.length ?? 0), 0);

  return (
    <div className="mt-6">
      {/* 툴바 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            placeholder="이름, slug 검색…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 rounded-lg border-0 shadow-sm text-sm bg-white w-48 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <button
          type="button"
          onClick={() => setHideInactive((v) => !v)}
          className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
            hideInactive
              ? "bg-zinc-900 text-white"
              : "bg-white shadow-sm text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {hideInactive ? "비활성 숨김" : "비활성 포함"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-400 tabular-nums">전체 {totalCount}</span>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={openGroupConfigCreate}>
            <Plus className="w-4 h-4" />
            새 그룹
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={openCreateAll}>
            <Plus className="w-4 h-4" />
            새 Tag
          </Button>
        </div>
      </div>

      {/* 그룹 컬럼 그리드 (DnD) */}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedConfigs.map((c) => c.group)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-4">
            {orderedConfigs.map((config) => (
              <SortableGroupColumn
                key={config.group}
                groupConfig={config}
                tags={tagsByGroup[config.group] ?? []}
                onEdit={openEdit}
                onAdd={openCreate}
                onEditGroupConfig={openGroupConfigEdit}
                onDeleteGroup={handleDeleteGroup}
                hideInactive={hideInactive}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Tag Dialog */}
      <TagDialog
        open={dialogOpen}
        tag={editingTag}
        defaultGroup={defaultGroup}
        groupOptions={groupOptions}
        onClose={handleClose}
        onSaved={handleTagSaved}
        onDeleted={handleTagDeleted}
      />

      {/* Group Config Dialog */}
      <TagGroupConfigDialog
        open={groupConfigDialogOpen}
        mode={groupConfigDialogMode}
        groupConfig={editingGroupConfig}
        onClose={handleGroupConfigClose}
        onCreated={handleGroupCreated}
        onUpdated={handleGroupUpdated}
      />
    </div>
  );
}
