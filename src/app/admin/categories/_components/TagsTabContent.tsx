"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagGroup } from "@prisma/client";
import { SortableTagList, ColorLabel, type TagItem, type TagGroupConfigItem } from "./SortableTagList";
import { TagDialog } from "./TagDialog";
import { TagGroupConfigDialog } from "./TagGroupConfigDialog";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const GROUP_LABEL: Record<TagGroup, string> = {
  FOOD: "음식",
  SPOT: "장소",
  EXPERIENCE: "경험",
  ITEM: "아이템",
  BEAUTY: "뷰티",
};

const GROUP_NAME_DEFAULT: Record<TagGroup, string> = {
  FOOD: "Food",
  SPOT: "Spot",
  EXPERIENCE: "Experience",
  ITEM: "Item",
  BEAUTY: "Beauty",
};

const ALL_GROUPS: TagGroup[] = ["FOOD", "SPOT", "EXPERIENCE", "ITEM", "BEAUTY"];

// ─── GroupColumn ──────────────────────────────────────────────────────────────

function GroupColumn({
  group,
  groupConfig,
  tags,
  onEdit,
  onAdd,
  onEditGroupConfig,
  hideInactive,
  searchQuery,
}: {
  group: TagGroup;
  groupConfig: TagGroupConfigItem;
  tags: TagItem[];
  onEdit: (tag: TagItem) => void;
  onAdd: (group: TagGroup) => void;
  onEditGroupConfig: (config: TagGroupConfigItem) => void;
  hideInactive?: boolean;
  searchQuery?: string;
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

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* 컬럼 헤더 */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
        <ColorLabel
          name={groupConfig.nameEn || GROUP_NAME_DEFAULT[group]}
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
          aria-label="그룹 설정 편집"
          title="그룹 색상·이름 편집"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onAdd(group)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="태그 추가"
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

// ─── TagsTabContent ───────────────────────────────────────────────────────────

interface TagsTabContentProps {
  tagsByGroup: Record<string, TagItem[]>;
  groupConfigs: TagGroupConfigItem[];
}

export function TagsTabContent({ tagsByGroup, groupConfigs }: TagsTabContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [defaultGroup, setDefaultGroup] = useState<TagGroup | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [groupConfigDialogOpen, setGroupConfigDialogOpen] = useState(false);
  const [editingGroupConfig, setEditingGroupConfig] = useState<TagGroupConfigItem | null>(null);

  const groupConfigMap = new Map(groupConfigs.map((c) => [c.group, c]));

  function openCreate(group: TagGroup) {
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
    setDefaultGroup("FOOD");
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingTag(null);
    setDefaultGroup(null);
  }

  function openGroupConfigEdit(config: TagGroupConfigItem) {
    setEditingGroupConfig(config);
    setGroupConfigDialogOpen(true);
  }

  function handleGroupConfigClose() {
    setGroupConfigDialogOpen(false);
    setEditingGroupConfig(null);
  }

  const totalCount = ALL_GROUPS.reduce((acc, g) => acc + (tagsByGroup[g]?.length ?? 0), 0);

  return (
    <div className="mt-6">
      {/* 요약 + 툴바 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          5개 그룹 태그 관리&nbsp;
          <span className="font-medium text-foreground">전체 {totalCount}</span>
        </p>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            placeholder="이름, slug 검색…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 px-2.5 rounded-lg border border-border text-sm bg-transparent w-48 focus:outline-none focus:ring-1 focus:ring-border"
          />
          <button
            type="button"
            onClick={() => setHideInactive((v) => !v)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              hideInactive
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {hideInactive ? "비활성 숨김" : "비활성 포함"}
          </button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={openCreateAll}
          >
            <Plus className="w-4 h-4" />
            새 Tag
          </Button>
        </div>
      </div>

      {/* 3컬럼 그리드 (5개 그룹 → 3+2 배치) */}
      <div className="grid grid-cols-3 gap-4">
        {ALL_GROUPS.map((group) => (
          <GroupColumn
            key={group}
            group={group}
            groupConfig={groupConfigMap.get(group) ?? { group, nameEn: "", colorHex: "#C6FD09", colorHex2: null, gradientDir: "to bottom", gradientStop: 150, textColorHex: "#000000" }}
            tags={tagsByGroup[group] ?? []}
            onEdit={openEdit}
            onAdd={openCreate}
            onEditGroupConfig={openGroupConfigEdit}
            hideInactive={hideInactive}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* Tag Dialog */}
      <TagDialog
        open={dialogOpen}
        tag={editingTag}
        defaultGroup={defaultGroup}
        onClose={handleClose}
      />

      {/* Group Config Dialog */}
      <TagGroupConfigDialog
        open={groupConfigDialogOpen}
        groupConfig={editingGroupConfig}
        onClose={handleGroupConfigClose}
      />
    </div>
  );
}
