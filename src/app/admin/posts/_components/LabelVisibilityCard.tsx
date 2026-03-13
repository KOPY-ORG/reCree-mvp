"use client";

import { useMemo } from "react";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { LabelBadge } from "@/components/LabelBadge";
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

type SectionItem = {
  id: string;
  isVisible: boolean;
  label: string;
  background: string;
  color: string;
};

function getTagColors(tag: TagForForm): { background: string; color: string } {
  const background = tag.effectiveColorHex2
    ? `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`
    : tag.effectiveColorHex;
  return { background, color: tag.effectiveTextColorHex };
}

function SortableLabel({ item, isFirst }: { item: SectionItem; isFirst: boolean }) {
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
      <LabelBadge text={item.label} background={item.background} color={item.color} />
      {isFirst && (
        <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          대표
        </span>
      )}
    </div>
  );
}

function LabelSection({
  title,
  dndId,
  items,
  sensors,
  onToggle,
  onDragEnd,
}: {
  title: string;
  dndId: string;
  items: SectionItem[];
  sensors: ReturnType<typeof useSensors>;
  onToggle: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const visibleItems = items.filter((item) => item.isVisible);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={`shrink-0 transition-colors ${item.isVisible ? "text-foreground" : "text-muted-foreground/40"}`}
            >
              {item.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <LabelBadge text={item.label} background={item.background} color={item.color} />
          </div>
        ))}
      </div>
      {visibleItems.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">순서 (드래그)</p>
          <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {visibleItems.map((item, idx) => (
                  <SortableLabel key={item.id} item={item} isFirst={idx === 0} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
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

  const topicItems = useMemo<SectionItem[]>(() =>
    postTopics
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((pt) => {
        const s = topicEffectiveStyleMap.get(pt.topicId) ?? {};
        return {
          id: pt.topicId,
          isVisible: pt.isVisible,
          label: topicMap.get(pt.topicId)?.nameEn ?? pt.topicId,
          background: String(s.background ?? ""),
          color: String(s.color ?? "#000"),
        };
      }),
  [postTopics, topicMap, topicEffectiveStyleMap]);

  const tagItems = useMemo<SectionItem[]>(() =>
    postTags
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((pt) => {
        const t = tagMap.get(pt.tagId);
        const { background, color } = t ? getTagColors(t) : { background: "", color: "#000" };
        return {
          id: pt.tagId,
          isVisible: pt.isVisible,
          label: t?.name ?? pt.tagId,
          background,
          color,
        };
      }),
  [postTags, tagMap]);

  const handleTopicDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visibleTopics = topicItems.filter((i) => i.isVisible);
    const oldIndex = visibleTopics.findIndex((i) => i.id === active.id);
    const newIndex = visibleTopics.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    arrayMove(visibleTopics, oldIndex, newIndex).forEach((item, idx) => {
      setPostTopics((prev) => prev.map((pt) => pt.topicId === item.id ? { ...pt, displayOrder: idx } : pt));
    });
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visibleTags = tagItems.filter((i) => i.isVisible);
    const oldIndex = visibleTags.findIndex((i) => i.id === active.id);
    const newIndex = visibleTags.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    arrayMove(visibleTags, oldIndex, newIndex).forEach((item, idx) => {
      setPostTags((prev) => prev.map((pt) => pt.tagId === item.id ? { ...pt, displayOrder: idx } : pt));
    });
  };

  if (postTopics.length === 0 && postTags.length === 0) return null;

  return (
    <Card className="gap-3 py-4 border-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">라벨 표시 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {postTopics.length > 0 && (
          <LabelSection
            title="토픽"
            dndId="label-topics-dnd"
            items={topicItems}
            sensors={sensors}
            onToggle={(id) => setPostTopics((prev) => prev.map((pt) => pt.topicId === id ? { ...pt, isVisible: !pt.isVisible } : pt))}
            onDragEnd={handleTopicDragEnd}
          />
        )}
        {postTags.length > 0 && (
          <LabelSection
            title="태그"
            dndId="label-tags-dnd"
            items={tagItems}
            sensors={sensors}
            onToggle={(id) => setPostTags((prev) => prev.map((pt) => pt.tagId === id ? { ...pt, isVisible: !pt.isVisible } : pt))}
            onDragEnd={handleTagDragEnd}
          />
        )}
      </CardContent>
    </Card>
  );
}
