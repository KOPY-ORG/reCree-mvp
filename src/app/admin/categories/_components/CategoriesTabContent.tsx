"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SortableTopicList, type TopicNode } from "./SortableTopicList";
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

// ─── CategoryColumn ───────────────────────────────────────────────────────────

function CategoryColumn({
  root,
  onEdit,
  onAdd,
}: {
  root: TopicNode;
  onEdit: (topic: TopicNode) => void;
  onAdd: (parentTopic: TopicNode) => void;
}) {
  const totalCount = countDescendants(root);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* 컬럼 헤더 */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
        <span className="font-bold text-sm tracking-wide">{root.nameKo}</span>
        {root.nameEn && (
          <span className="text-xs text-muted-foreground">{root.nameEn}</span>
        )}
        {/* 루트 편집 */}
        <button
          type="button"
          onClick={() => onEdit(root)}
          className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="루트 편집"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
        {/* 루트 바로 아래에 새 항목 추가 */}
        <button
          type="button"
          onClick={() => onAdd(root)}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="하위 추가"
        >
          <Plus className="w-3 h-3" />
        </button>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {totalCount}
        </span>
      </div>

      {/* Level 1 목록 (드래그앤드롭) */}
      <div>
        {root.children.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            하위 항목 없음
          </p>
        ) : (
          <SortableTopicList items={root.children} level={1} onEdit={onEdit} onAdd={onAdd} />
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
    ? { hex: parentTopic.effectiveColorHex, hex2: parentTopic.effectiveColorHex2, textHex: parentTopic.effectiveTextColorHex }
    : null;

  const totalCount = allTopics.length;

  return (
    <div className="mt-6">
      {/* 요약 + 새 Topic 버튼 */}
      <div className="flex items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {tree.map((r) => r.nameKo).join(" · ")} 아티스트, 작품 분류 관리
          &nbsp;
          <span className="font-medium text-foreground">전체 {totalCount}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1.5"
          onClick={() => openCreate()}
        >
          <Plus className="w-4 h-4" />
          새 Topic
        </Button>
      </div>

      {/* 2컬럼 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {tree.map((root) => (
          <CategoryColumn key={root.id} root={root} onEdit={openEdit} onAdd={openAddChild} />
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
