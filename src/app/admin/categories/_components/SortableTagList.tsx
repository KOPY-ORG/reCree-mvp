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
import { GripVertical, Pencil } from "lucide-react";
import { reorderTags } from "../actions";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface TagItem {
  id: string;
  name: string;
  nameKo: string;
  slug: string;
  group: string;
  colorHex: string | null;          // DB 값 (null = 그룹 색 상속)
  colorHex2: string | null;
  textColorHex: string | null;      // DB 값 (null = 그룹 색 상속)
  effectiveColorHex: string;        // 해석된 배경색
  effectiveColorHex2: string | null;
  effectiveGradientDir: string;
  effectiveGradientStop: number;
  effectiveTextColorHex: string;
  isActive: boolean;
  sortOrder: number;
}

export interface TagGroupConfigItem {
  group: string;
  nameEn: string;       // 라벨에 표시될 영어 이름 (빈 문자열 = group key 폴백)
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  sortOrder: number;
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
  name,
  colorHex,
  colorHex2,
  gradientDir = "to bottom",
  gradientStop = 150,
  textColorHex,
  className,
}: {
  name: string;
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
      {name}
    </span>
  );
}

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

// ─── SortableTagItem ──────────────────────────────────────────────────────────

function SortableTagItem({
  item,
  onEdit,
  hideInactive,
}: {
  item: TagItem;
  onEdit?: (t: TagItem) => void;
  hideInactive?: boolean;
}) {
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
      <div className="flex items-center gap-2.5 pl-1 pr-3 py-2.5 text-sm flex-1 min-w-0">
        <ActiveDot isActive={item.isActive} />
        <span className="text-sm truncate min-w-0">{item.nameKo}</span>
        <ColorLabel
          name={item.name}
          colorHex={item.effectiveColorHex}
          colorHex2={item.effectiveColorHex2}
          gradientDir={item.effectiveGradientDir}
          gradientStop={item.effectiveGradientStop}
          textColorHex={item.effectiveTextColorHex}
        />
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
            aria-label="편집"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SortableTagList ──────────────────────────────────────────────────────────

export function SortableTagList({
  items,
  onEdit,
  hideInactive,
}: {
  items: TagItem[];
  onEdit?: (tag: TagItem) => void;
  hideInactive?: boolean;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [, startTransition] = useTransition();
  const dndId = useId();

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
      reorderTags(next.map((i) => i.id));
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
          {orderedItems.map((item) => (
            <SortableTagItem key={item.id} item={item} onEdit={onEdit} hideInactive={hideInactive} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
