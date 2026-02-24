"use client";

import { useState, useTransition, useId, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus } from "lucide-react";
import { reorderTopics } from "../actions";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface TopicNode {
  id: string;
  nameKo: string;
  nameEn: string;
  slug: string;
  colorHex: string | null;           // DB 값 (null = 부모 상속)
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
  effectiveColorHex: string;
  effectiveColorHex2: string | null;
  effectiveGradientDir: string;
  effectiveGradientStop: number;
  effectiveTextColorHex: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  level: number;
  children: TopicNode[];
}

// ─── 공용 컴포넌트 ────────────────────────────────────────────────────────────

function ActiveDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isActive ? "bg-green-500" : "bg-gray-300"
      }`}
    />
  );
}

export function ColorLabel({
  nameEn,
  colorHex,
  colorHex2,
  gradientDir = "to bottom",
  gradientStop = 150,
  textColorHex,
  className,
}: {
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex: string;
  className?: string;
}) {
  const background = colorHex2
    ? `linear-gradient(${gradientDir}, ${colorHex}, ${colorHex2} ${gradientStop}%)`
    : colorHex;
  return (
    <span
      style={{ background, color: textColorHex }}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${className ?? ""}`}
    >
      {nameEn}
    </span>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
      aria-label="편집"
    >
      <Pencil className="w-3 h-3" />
    </button>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
      aria-label="하위 추가"
    >
      <Plus className="w-3 h-3" />
    </button>
  );
}

/**
 * 드래그 핸들
 * highlighted: 핸들 hover 또는 드래그 중일 때 true → 아이콘 강조
 */
function DragHandle({
  highlighted,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { highlighted: boolean }) {
  return (
    <span
      {...props}
      className={`cursor-grab active:cursor-grabbing px-1 flex items-center justify-center shrink-0 self-stretch transition-opacity select-none ${
        highlighted
          ? "opacity-60"
          : "opacity-0 group-hover/row:opacity-25 hover:opacity-50!"
      }`}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </span>
  );
}

// ─── Level 3 정렬 가능한 행 ───────────────────────────────────────────────────

function SortableLevel3Item({ item, onEdit, hideInactive }: { item: TopicNode; onEdit?: (t: TopicNode) => void; hideInactive?: boolean }) {
  const [handleHovered, setHandleHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const highlighted = handleHovered || isDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: (hideInactive && !item.isActive) ? "none" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row flex items-center border-b border-border/10 last:border-0 transition-colors ${
        highlighted ? "bg-muted/50" : ""
      }`}
    >
      <DragHandle
        highlighted={highlighted}
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        {...listeners}
        {...attributes}
      />
      <div className="flex items-center gap-2 pl-1 pr-2 py-1.5 text-sm flex-1 min-w-0">
        <span className="w-3 shrink-0" />
        <ActiveDot isActive={item.isActive} />
        <span className="text-sm truncate min-w-0">{item.nameKo}</span>
        <ColorLabel
          nameEn={item.nameEn}
          colorHex={item.effectiveColorHex}
          colorHex2={item.effectiveColorHex2}
          gradientDir={item.effectiveGradientDir}
          gradientStop={item.effectiveGradientStop}
          textColorHex={item.effectiveTextColorHex}
        />
        {onEdit && <EditButton onClick={() => onEdit(item)} />}
      </div>
    </div>
  );
}

// ─── Level 2 정렬 가능한 행 ────────────────────────────────────────────────────

function SortableLevel2Item({ item, onEdit, onAdd, hideInactive, forceOpen }: { item: TopicNode; onEdit?: (t: TopicNode) => void; onAdd?: (t: TopicNode) => void; hideInactive?: boolean; forceOpen?: boolean }) {
  const [handleHovered, setHandleHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const highlighted = handleHovered || isDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: (hideInactive && !item.isActive) ? "none" : undefined,
  };

  const hasChildren = item.children.length > 0;

  const rowContent = (
    <>
      <ActiveDot isActive={item.isActive} />
      <span className="text-sm truncate min-w-0">{item.nameKo}</span>
      <ColorLabel
        nameEn={item.nameEn}
        colorHex={item.effectiveColorHex}
        colorHex2={item.effectiveColorHex2}
        gradientDir={item.effectiveGradientDir}
        gradientStop={item.effectiveGradientStop}
        textColorHex={item.effectiveTextColorHex}
      />
      {hasChildren && (
        <span className="text-xs text-muted-foreground shrink-0 group-open/l2:hidden">
          +{item.children.length}
        </span>
      )}
    </>
  );

  if (!hasChildren) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group/row flex items-center border-b border-border/10 last:border-0 transition-colors ${
          highlighted ? "bg-muted/50" : ""
        }`}
      >
        <DragHandle
          highlighted={highlighted}
          onMouseEnter={() => setHandleHovered(true)}
          onMouseLeave={() => setHandleHovered(false)}
          {...listeners}
          {...attributes}
        />
        <div className="flex items-center gap-2 pl-1 pr-2 py-1.5 text-sm flex-1 min-w-0">
          <span className="w-3 shrink-0" />
          {rowContent}
          {onAdd && <AddButton onClick={() => onAdd(item)} />}
          {onEdit && <EditButton onClick={() => onEdit(item)} />}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row flex items-start border-b border-border/10 last:border-0 transition-colors ${
        highlighted ? "bg-muted/50" : ""
      }`}
    >
      <DragHandle
        highlighted={highlighted}
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        {...listeners}
        {...attributes}
      />
      {/* details 아코디언: 핸들과 분리되어 클릭 이벤트 충돌 없음 */}
      <details className="group/l2 flex-1 min-w-0" open={forceOpen || undefined}>
        <summary
          className={`list-none flex items-center gap-2 pl-1 pr-2 py-1.5 cursor-pointer text-sm transition-colors ${
            highlighted ? "" : "hover:bg-muted/50"
          }`}
        >
          <span className="w-3 h-3 flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-150 group-open/l2:rotate-90">
            ›
          </span>
          {rowContent}
          {onAdd && <AddButton onClick={() => onAdd(item)} />}
          {onEdit && <EditButton onClick={() => onEdit(item)} />}
        </summary>
        {/* 자식 목록: 부모 핸들 hover 시 함께 하이라이트 */}
        <div className={highlighted ? "bg-muted/30" : ""}>
          <SortableTopicList items={item.children} level={3} onEdit={onEdit} hideInactive={hideInactive} />
        </div>
      </details>
    </div>
  );
}

// ─── Level 1 정렬 가능한 행 ────────────────────────────────────────────────────

function SortableLevel1Item({ item, onEdit, onAdd, hideInactive, forceOpen }: { item: TopicNode; onEdit?: (t: TopicNode) => void; onAdd?: (t: TopicNode) => void; hideInactive?: boolean; forceOpen?: boolean }) {
  const [handleHovered, setHandleHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const highlighted = handleHovered || isDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: (hideInactive && !item.isActive) ? "none" : undefined,
  };

  const hasChildren = item.children.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row flex items-start border-b border-border/20 last:border-0 transition-colors ${
        highlighted ? "bg-muted/50" : ""
      }`}
    >
      <DragHandle
        highlighted={highlighted}
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        {...listeners}
        {...attributes}
      />
      <details className="group/l1 flex-1 min-w-0" open={forceOpen || undefined}>
        <summary
          className={`list-none flex items-center gap-2 pl-1 pr-2 py-2.5 cursor-pointer transition-colors ${
            highlighted ? "" : "hover:bg-muted/50"
          }`}
        >
          <span className="w-3 h-3 flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-150 group-open/l1:rotate-90">
            ›
          </span>
          <span className="font-semibold text-sm">{item.nameKo}</span>
          <ColorLabel
            nameEn={item.nameEn}
            colorHex={item.effectiveColorHex}
            colorHex2={item.effectiveColorHex2}
            gradientDir={item.effectiveGradientDir}
            gradientStop={item.effectiveGradientStop}
            textColorHex={item.effectiveTextColorHex}
          />
          {hasChildren && (
            <span className="text-xs text-muted-foreground group-open/l1:hidden">
              +{item.children.length}
            </span>
          )}
          {onAdd && <AddButton onClick={() => onAdd(item)} />}
          {onEdit && <EditButton onClick={() => onEdit(item)} />}
        </summary>

        {/* 자식 목록: 부모 핸들 hover 시 함께 하이라이트 */}
        {hasChildren && (
          <div className={highlighted ? "bg-muted/30" : ""}>
            <SortableTopicList items={item.children} level={2} onEdit={onEdit} onAdd={onAdd} hideInactive={hideInactive} forceOpen={forceOpen} />
          </div>
        )}
      </details>
    </div>
  );
}

// ─── SortableTopicList (Level 1 / 2 / 3 공통) ────────────────────────────────

export function SortableTopicList({
  items,
  level,
  onEdit,
  onAdd,
  hideInactive,
  forceOpen,
}: {
  items: TopicNode[];
  level: 1 | 2 | 3;
  onEdit?: (topic: TopicNode) => void;
  onAdd?: (topic: TopicNode) => void;
  hideInactive?: boolean;
  forceOpen?: boolean;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [, startTransition] = useTransition();
  const dndId = useId();

  // 서버에서 새 데이터가 내려오면 로컬 state 동기화
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
    const newIndex = orderedItems.findIndex((i) => i.id === over.id);
    const next = arrayMove(orderedItems, oldIndex, newIndex);

    setOrderedItems(next);
    startTransition(() => {
      reorderTopics(next.map((i) => i.id));
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {orderedItems.map((item) => {
            if (level === 1) return <SortableLevel1Item key={item.id} item={item} onEdit={onEdit} onAdd={onAdd} hideInactive={hideInactive} forceOpen={forceOpen} />;
            if (level === 2) return <SortableLevel2Item key={item.id} item={item} onEdit={onEdit} onAdd={onAdd} hideInactive={hideInactive} forceOpen={forceOpen} />;
            return <SortableLevel3Item key={item.id} item={item} onEdit={onEdit} hideInactive={hideInactive} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
