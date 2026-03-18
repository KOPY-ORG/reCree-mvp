"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Search } from "lucide-react";
import { SortableTopicList, ColorLabel, type TopicNode } from "./SortableTopicList";
import { TopicDialog } from "./TopicDialog";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface FlatTopic {
  id: string;
  nameKo: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  effectiveColorHex: string;
  effectiveColorHex2: string | null;
  effectiveGradientDir: string;
  effectiveGradientStop: number;
  effectiveTextColorHex: string;
}

interface CategoriesTabContentProps {
  tree: TopicNode[];           // 트리 구조 (렌더링용)
  allTopics: FlatTopic[];      // flat 목록 (부모 선택 드롭다운용)
}

// ─── countDescendants ─────────────────────────────────────────────────────────

function countDescendants(node: TopicNode): number {
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}

// ─── filterTree ───────────────────────────────────────────────────────────────

function filterTree(nodes: TopicNode[], q: string): TopicNode[] {
  if (!q) return nodes;
  const lower = q.toLowerCase();
  return nodes.flatMap((node) => {
    const filteredChildren = filterTree(node.children, q);
    const matches =
      node.nameKo.toLowerCase().includes(lower) ||
      node.nameEn.toLowerCase().includes(lower) ||
      node.slug.includes(lower);
    if (matches || filteredChildren.length > 0) {
      return [{ ...node, children: filteredChildren }];
    }
    return [];
  });
}

// ─── CategoryColumn ───────────────────────────────────────────────────────────

function CategoryColumn({
  root,
  onEdit,
  onAdd,
  hideInactive,
  forceOpen,
}: {
  root: TopicNode;
  onEdit: (topic: TopicNode) => void;
  onAdd: (parentTopic: TopicNode) => void;
  hideInactive?: boolean;
  forceOpen?: boolean;
}) {
  const totalCount = countDescendants(root);

  return (
    <div className="rounded-xl overflow-hidden bg-white shadow-sm">
      {/* 컬럼 헤더 */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
        <ColorLabel
          nameEn={root.nameEn}
          colorHex={root.effectiveColorHex}
          colorHex2={root.effectiveColorHex2}
          gradientDir={root.effectiveGradientDir}
          gradientStop={root.effectiveGradientStop}
          textColorHex={root.effectiveTextColorHex}
          className="text-sm px-3 py-1"
        />
        <span className="flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">{totalCount}</span>
        <button
          type="button"
          onClick={() => onEdit(root)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="루트 편집"
          title="편집"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onAdd(root)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="하위 추가"
          title="하위 항목 추가"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Level 1 목록 (드래그앤드롭) */}
      <div>
        {root.children.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            하위 항목 없음
          </p>
        ) : (
          <SortableTopicList items={root.children} level={1} onEdit={onEdit} onAdd={onAdd} hideInactive={hideInactive} forceOpen={forceOpen} />
        )}
      </div>
    </div>
  );
}

// ─── CategoriesTabContent ─────────────────────────────────────────────────────

export function CategoriesTabContent({ tree, allTopics }: CategoriesTabContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicNode | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function openCreate(parentId?: string | null) {
    setEditingTopic(null);
    setCreateParentId(parentId ?? null);
    setDialogOpen(true);
  }

  function openEdit(topic: TopicNode) {
    setEditingTopic(topic);
    setCreateParentId(null);
    setDialogOpen(true);
  }

  function openAddChild(parentTopic: TopicNode) {
    openCreate(parentTopic.id);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingTopic(null);
    setCreateParentId(null);
  }

  // 부모 effective color 계산 (수정 모드: editingTopic.parentId, 생성 모드: createParentId)
  const resolvedParentId = editingTopic ? editingTopic.parentId : createParentId;
  const parentTopic = resolvedParentId ? allTopics.find((t) => t.id === resolvedParentId) : null;
  const parentEffectiveColor = parentTopic
    ? { hex: parentTopic.effectiveColorHex, hex2: parentTopic.effectiveColorHex2, gradientDir: parentTopic.effectiveGradientDir, gradientStop: parentTopic.effectiveGradientStop, textHex: parentTopic.effectiveTextColorHex }
    : null;

  const totalCount = allTopics.length;
  const filteredTree = filterTree(tree, searchQuery.trim());
  const forceOpen = searchQuery.trim().length > 0;

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
          <Button
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => openCreate()}
          >
            <Plus className="w-4 h-4" />
            새 Topic
          </Button>
        </div>
      </div>

      {/* 2컬럼 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {filteredTree.map((root) => (
          <CategoryColumn key={root.id} root={root} onEdit={openEdit} onAdd={openAddChild} hideInactive={hideInactive} forceOpen={forceOpen} />
        ))}
      </div>

      {/* Dialog */}
      <TopicDialog
        open={dialogOpen}
        topic={editingTopic}
        defaultParentId={createParentId}
        allTopics={allTopics}
        parentEffectiveColor={parentEffectiveColor}
        onClose={handleClose}
      />
    </div>
  );
}
