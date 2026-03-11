"use client";

import { useMemo } from "react";
import { Eye, EyeOff, GripVertical } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopicForForm, TagForForm } from "./PostForm";

type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };

function getTagStyle(tag: TagForForm): React.CSSProperties {
  if (tag.effectiveColorHex2) {
    return {
      background: `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`,
      color: tag.effectiveTextColorHex,
    };
  }
  return { backgroundColor: tag.effectiveColorHex, color: tag.effectiveTextColorHex };
}

type LabelItem = {
  id: string;
  type: "topic" | "tag";
  displayOrder: number;
  topicId?: string;
  tagId?: string;
  label: string;
  style: React.CSSProperties;
};

function SortableLabel({ item }: { item: LabelItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={item.style}
      >
        {item.label}
      </span>
    </div>
  );
}

interface Props {
  postTopics: PostTopicState[];
  setPostTopics: React.Dispatch<React.SetStateAction<PostTopicState[]>>;
  postTags: PostTagState[];
  setPostTags: React.Dispatch<React.SetStateAction<PostTagState[]>>;
  allTopics: TopicForForm[];
  allTags: TagForForm[];
  topicEffectiveStyleMap: Map<string, React.CSSProperties>;
}

export function LabelVisibilityCard({
  postTopics, setPostTopics,
  postTags, setPostTags,
  allTopics, allTags,
  topicEffectiveStyleMap,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor));
  const topicMap = useMemo(() => new Map(allTopics.map((t) => [t.id, t])), [allTopics]);
  const tagMap = useMemo(() => new Map(allTags.map((t) => [t.id, t])), [allTags]);

  const totalCount = postTopics.length + postTags.length;

  const visibleItems = useMemo<LabelItem[]>(() => {
    const items: LabelItem[] = [
      ...postTopics.filter((pt) => pt.isVisible).map((pt) => ({
        id: `topic-${pt.topicId}`,
        type: "topic" as const,
        topicId: pt.topicId,
        displayOrder: pt.displayOrder,
        label: topicMap.get(pt.topicId)?.nameEn ?? pt.topicId,
        style: topicEffectiveStyleMap.get(pt.topicId) ?? {},
      })),
      ...postTags.filter((pt) => pt.isVisible).map((pt) => {
        const t = tagMap.get(pt.tagId);
        return {
          id: `tag-${pt.tagId}`,
          type: "tag" as const,
          tagId: pt.tagId,
          displayOrder: pt.displayOrder,
          label: t?.name ?? pt.tagId,
          style: t ? getTagStyle(t) : {},
        };
      }),
    ];
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [postTopics, postTags, topicMap, tagMap, topicEffectiveStyleMap]);

  const toggleTopicVisible = (topicId: string) => {
    setPostTopics((prev) =>
      prev.map((pt) => pt.topicId === topicId ? { ...pt, isVisible: !pt.isVisible } : pt),
    );
  };

  const toggleTagVisible = (tagId: string) => {
    setPostTags((prev) =>
      prev.map((pt) => pt.tagId === tagId ? { ...pt, isVisible: !pt.isVisible } : pt),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
    const newIndex = visibleItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(visibleItems, oldIndex, newIndex);
    reordered.forEach((item, idx) => {
      if (item.type === "topic" && item.topicId) {
        setPostTopics((prev) => prev.map((pt) => pt.topicId === item.topicId ? { ...pt, displayOrder: idx } : pt));
      } else if (item.type === "tag" && item.tagId) {
        setPostTags((prev) => prev.map((pt) => pt.tagId === item.tagId ? { ...pt, displayOrder: idx } : pt));
      }
    });
  };

  if (totalCount === 0) return null;

  return (
    <Card className="gap-3 py-4 border-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">라벨 표시 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 눈 토글 */}
        <div className="space-y-1">
          {postTopics.map((pt) => {
            const t = topicMap.get(pt.topicId);
            if (!t) return null;
            return (
              <div key={pt.topicId} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleTopicVisible(pt.topicId)}
                  className={`shrink-0 transition-colors ${pt.isVisible ? "text-foreground" : "text-muted-foreground/40"}`}
                >
                  {pt.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={topicEffectiveStyleMap.get(t.id) ?? {}}
                >
                  {t.nameEn}
                </span>
              </div>
            );
          })}
          {postTags.map((pt) => {
            const t = tagMap.get(pt.tagId);
            if (!t) return null;
            return (
              <div key={pt.tagId} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleTagVisible(pt.tagId)}
                  className={`shrink-0 transition-colors ${pt.isVisible ? "text-foreground" : "text-muted-foreground/40"}`}
                >
                  {pt.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={getTagStyle(t)}
                >
                  {t.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* 노출 순서 DnD */}
        {visibleItems.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">노출 순서 (드래그)</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <SortableLabel key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
