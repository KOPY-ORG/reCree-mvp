"use client";

import { useState, useTransition } from "react";
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
import { GripVertical } from "lucide-react";
import { TopicType } from "@prisma/client";
import { reorderTopics } from "../actions";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface TopicNode {
  id: string;
  nameKo: string;
  nameEn: string;
  type: TopicType;
  colorHex: string;
  textColorHex: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  level: number;
  children: TopicNode[];
}

// ─── 배지 상수 ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<TopicType, string> = {
  CATEGORY: "카테고리",
  GROUP: "그룹",
  PERSON: "인물",
  WORK: "작품",
  SEASON: "시즌",
  OTHER: "기타",
};

const TYPE_COLOR: Record<TopicType, string> = {
  CATEGORY: "bg-violet-100 text-violet-700",
  GROUP: "bg-blue-100 text-blue-700",
  PERSON: "bg-pink-100 text-pink-700",
  WORK: "bg-amber-100 text-amber-700",
  SEASON: "bg-emerald-100 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-600",
};

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

function TypeBadge({ type }: { type: TopicType }) {
  return (
    <span
      className={`ml-auto text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TYPE_COLOR[type]}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function ColorLabel({
  nameEn,
  colorHex,
  textColorHex,
}: {
  nameEn: string;
  colorHex: string;
  textColorHex: string;
}) {
  return (
    <span
      style={{ backgroundColor: colorHex, color: textColorHex }}
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
    >
      {nameEn}
    </span>
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

function SortableLevel3Item({ item }: { item: TopicNode }) {
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
          colorHex={item.colorHex}
          textColorHex={item.textColorHex}
        />
        <TypeBadge type={item.type} />
      </div>
    </div>
  );
}

// ─── Level 2 정렬 가능한 행 ────────────────────────────────────────────────────

function SortableLevel2Item({ item }: { item: TopicNode }) {
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
  };

  const hasChildren = item.children.length > 0;

  const rowContent = (
    <>
      <ActiveDot isActive={item.isActive} />
      <span className="text-sm truncate min-w-0">{item.nameKo}</span>
      <ColorLabel
        nameEn={item.nameEn}
        colorHex={item.colorHex}
        textColorHex={item.textColorHex}
      />
      {hasChildren && (
        <span className="text-xs text-muted-foreground shrink-0 group-open/l2:hidden">
          +{item.children.length}
        </span>
      )}
      <TypeBadge type={item.type} />
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
      <details className="group/l2 flex-1 min-w-0">
        <summary
          className={`list-none flex items-center gap-2 pl-1 pr-2 py-1.5 cursor-pointer text-sm transition-colors ${
            highlighted ? "" : "hover:bg-muted/50"
          }`}
        >
          <span className="w-3 h-3 flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-150 group-open/l2:rotate-90">
            ›
          </span>
          {rowContent}
        </summary>
        {/* 자식 목록: 부모 핸들 hover 시 함께 하이라이트 */}
        <div className={highlighted ? "bg-muted/30" : ""}>
          <SortableTopicList items={item.children} level={3} />
        </div>
      </details>
    </div>
  );
}

// ─── Level 1 정렬 가능한 행 ────────────────────────────────────────────────────

function SortableLevel1Item({ item }: { item: TopicNode }) {
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
      <details className="group/l1 flex-1 min-w-0">
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
            colorHex={item.colorHex}
            textColorHex={item.textColorHex}
          />
          {hasChildren && (
            <span className="text-xs text-muted-foreground group-open/l1:hidden">
              +{item.children.length}
            </span>
          )}
        </summary>

        {/* 자식 목록: 부모 핸들 hover 시 함께 하이라이트 */}
        {hasChildren && (
          <div className={highlighted ? "bg-muted/30" : ""}>
            <SortableTopicList items={item.children} level={2} />
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
}: {
  items: TopicNode[];
  level: 1 | 2 | 3;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [, startTransition] = useTransition();

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
            if (level === 1) return <SortableLevel1Item key={item.id} item={item} />;
            if (level === 2) return <SortableLevel2Item key={item.id} item={item} />;
            return <SortableLevel3Item key={item.id} item={item} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
