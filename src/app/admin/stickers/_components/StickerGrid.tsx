"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { updateStickerOrder, toggleStickerActive, deleteSticker } from "../_actions/sticker-actions";

interface Sticker {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
}

function SortableItem({ sticker }: { sticker: Sticker }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sticker.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 rounded-lg border bg-zinc-900 ${
        sticker.isActive ? "border-zinc-700" : "border-zinc-800 opacity-50"
      }`}
    >
      {/* 드래그 핸들 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-zinc-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleStickerActive(sticker.id)}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
            title={sticker.isActive ? "비활성화" : "활성화"}
          >
            {sticker.isActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`"${sticker.name}" 삭제할까요?`)) deleteSticker(sticker.id);
            }}
            className="p-1 rounded text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 이미지 */}
      <div className="aspect-square rounded bg-zinc-800 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sticker.imageUrl} alt={sticker.name} className="size-14 object-contain" />
      </div>

      {/* 이름 */}
      <p className="text-xs text-zinc-300 text-center truncate">{sticker.name}</p>
    </div>
  );
}

interface Props {
  initialStickers: Sticker[];
}

export function StickerGrid({ initialStickers }: Props) {
  const [stickers, setStickers] = useState(initialStickers);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = stickers.findIndex((s) => s.id === active.id);
    const newIdx = stickers.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stickers, oldIdx, newIdx);
    setStickers(reordered);
    await updateStickerOrder(reordered.map((s) => s.id));
  }

  if (stickers.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-8">
        아직 스티커가 없습니다. 위에서 추가해주세요.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stickers.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 gap-3">
          {stickers.map((s) => (
            <SortableItem key={s.id} sticker={s} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
