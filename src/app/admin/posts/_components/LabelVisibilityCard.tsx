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
import type { TopicForForm, TagForForm, TagGroupItem } from "./PostForm";

const K_SCENE_GROUP = "K_MEDIA";

type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };

type SectionItem = {
  id: string;
  isVisible: boolean;
  label: string;
  background: string;
  color: string;
  hint?: string;
};

type PreviewLabel = { text: string; background: string; color: string };
type PreviewSlot = {
  group: string;
  name: string;
  displayLabel: string | null;
  background: string;
  color: string;
};

function getTagColors(tag: TagForForm): { background: string; color: string } {
  const background = tag.effectiveColorHex2
    ? `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`
    : tag.effectiveColorHex;
  return { background, color: tag.effectiveTextColorHex };
}

// ─── 미리보기 ─────────────────────────────────────────────────────────────────

function PreviewSection({
  preview,
}: {
  preview: { home: PreviewLabel[]; list: PreviewLabel[]; detail: PreviewLabel[] };
}) {
  const rows: { label: string; labels: PreviewLabel[] }[] = [
    { label: "홈", labels: preview.home },
    { label: "목록", labels: preview.list },
    { label: "상세", labels: preview.detail },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">미리보기</p>
      <div className="space-y-1.5">
        {rows.map(({ label, labels }) => (
          <div key={label} className="flex items-start gap-2.5">
            <span className="text-xs font-semibold text-muted-foreground/60 w-7 shrink-0 pt-[3px]">{label}</span>
            <div className="flex flex-wrap gap-1 [--pill-fs:0.625rem]">
              {labels.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/30 italic pt-[3px]">없음</span>
              ) : (
                labels.map((l, i) => (
                  <LabelBadge key={i} text={l.text} background={l.background} color={l.color} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 통합 행 컴포넌트 ──────────────────────────────────────────────────────────

function SortableItemRow({
  item,
  isFirst,
  showGrip,
  onToggle,
}: {
  item: SectionItem;
  isFirst: boolean;
  showGrip: boolean;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 rounded-md border border-border/30 bg-background px-2 py-1.5"
    >
      <span
        {...(showGrip ? { ...attributes, ...listeners } : {})}
        className={`shrink-0 text-muted-foreground ${showGrip ? "cursor-grab hover:text-foreground" : "invisible pointer-events-none"}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className="shrink-0 text-foreground transition-colors hover:text-muted-foreground"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <LabelBadge text={item.label} background={item.background} color={item.color} />
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {isFirst && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            대표
          </span>
        )}
        {item.hint && (
          <span className="text-[10px] text-muted-foreground/55">→ &ldquo;{item.hint}&rdquo;</span>
        )}
      </div>
    </div>
  );
}

function StaticItemRow({
  item,
  onToggle,
}: {
  item: SectionItem;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 opacity-40">
      <span className="invisible shrink-0 pointer-events-none">
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
      <LabelBadge text={item.label} background={item.background} color={item.color} />
      {item.hint && (
        <div className="ml-auto shrink-0">
          <span className="text-[10px] text-muted-foreground/55">→ &ldquo;{item.hint}&rdquo;</span>
        </div>
      )}
    </div>
  );
}

// ─── 그룹 섹션 ────────────────────────────────────────────────────────────────

function GroupSection({
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
  if (items.length === 0) return null;

  const visibleItems = items.filter((i) => i.isVisible);
  const invisibleItems = items.filter((i) => !i.isVisible);
  const showGrip = visibleItems.length > 1;

  return (
    <div className="space-y-1.5">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <span className="w-[3px] h-3.5 rounded-full bg-muted-foreground/30 shrink-0" />
        <p className="text-xs font-semibold text-foreground/75">{title}</p>
      </div>

      <div className="space-y-1">
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visibleItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {visibleItems.map((item, idx) => (
              <SortableItemRow
                key={item.id}
                item={item}
                isFirst={idx === 0}
                showGrip={showGrip}
                onToggle={onToggle}
              />
            ))}
          </SortableContext>
        </DndContext>
        {invisibleItems.map((item) => (
          <StaticItemRow key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface Props {
  postTopics: PostTopicState[];
  setPostTopics: React.Dispatch<React.SetStateAction<PostTopicState[]>>;
  postTags: PostTagState[];
  setPostTags: React.Dispatch<React.SetStateAction<PostTagState[]>>;
  allTopics: TopicForForm[];
  allTags: TagForForm[];
  topicEffectiveStyleMap: Map<string, React.CSSProperties>;
  tagGroups: TagGroupItem[];
}

export function LabelVisibilityCard({
  postTopics, setPostTopics,
  postTags, setPostTags,
  allTopics, allTags,
  topicEffectiveStyleMap,
  tagGroups,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor));
  const topicMap = useMemo(() => new Map(allTopics.map((t) => [t.id, t])), [allTopics]);
  const tagMap = useMemo(() => new Map(allTags.map((t) => [t.id, t])), [allTags]);
  const tagGroupMap = useMemo(() => new Map(tagGroups.map((g) => [g.group, g])), [tagGroups]);

  // ─── 섹션별 아이템 ──────────────────────────────────────────────────────────

  const topicItems = useMemo<SectionItem[]>(() =>
    [...postTopics]
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

  const ksceneItems = useMemo<SectionItem[]>(() =>
    [...postTags]
      .filter((pt) => tagMap.get(pt.tagId)?.group === K_SCENE_GROUP)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((pt) => {
        const t = tagMap.get(pt.tagId);
        const { background, color } = t ? getTagColors(t) : { background: "", color: "#000" };
        return { id: pt.tagId, isVisible: pt.isVisible, label: t?.name ?? pt.tagId, background, color };
      }),
  [postTags, tagMap]);

  const otherTagItems = useMemo<SectionItem[]>(() =>
    [...postTags]
      .filter((pt) => tagMap.get(pt.tagId)?.group !== K_SCENE_GROUP)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((pt) => {
        const t = tagMap.get(pt.tagId);
        const { background, color } = t ? getTagColors(t) : { background: "", color: "#000" };
        const hint = t ? (tagGroupMap.get(t.group)?.displayLabel ?? undefined) : undefined;
        return { id: pt.tagId, isVisible: pt.isVisible, label: t?.name ?? pt.tagId, background, color, hint };
      }),
  [postTags, tagMap, tagGroupMap]);

  // ─── 미리보기 계산 ──────────────────────────────────────────────────────────

  const preview = useMemo(() => {
    const visibleTopics = [...postTopics]
      .filter((pt) => pt.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const visibleKscene = [...postTags]
      .filter((pt) => pt.isVisible && tagMap.get(pt.tagId)?.group === K_SCENE_GROUP)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const visibleOther = [...postTags]
      .filter((pt) => pt.isVisible && tagMap.get(pt.tagId)?.group !== K_SCENE_GROUP)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const topicSlots: PreviewSlot[] = visibleTopics.map((pt) => {
      const s = topicEffectiveStyleMap.get(pt.topicId) ?? {};
      return {
        group: "TOPIC",
        name: topicMap.get(pt.topicId)?.nameEn ?? pt.topicId,
        displayLabel: null,
        background: String(s.background ?? ""),
        color: String(s.color ?? "#000"),
      };
    });

    const ksceneSlots: PreviewSlot[] = visibleKscene.map((pt) => {
      const t = tagMap.get(pt.tagId)!;
      const { background, color } = t ? getTagColors(t) : { background: "", color: "#000" };
      return { group: K_SCENE_GROUP, name: t?.name ?? pt.tagId, displayLabel: null, background, color };
    });

    const otherSlots: PreviewSlot[] = visibleOther.map((pt) => {
      const t = tagMap.get(pt.tagId)!;
      const { background, color } = t ? getTagColors(t) : { background: "", color: "#000" };
      const displayLabel = t ? (tagGroupMap.get(t.group)?.displayLabel ?? null) : null;
      return { group: t?.group ?? "OTHER", name: t?.name ?? pt.tagId, displayLabel, background, color };
    });

    function applyText(selected: PreviewSlot[]): PreviewLabel[] {
      return selected.map((slot) => {
        const hasOtherGroup = selected.some((s) => s.group !== slot.group);
        const text = slot.displayLabel && hasOtherGroup ? slot.displayLabel : slot.name;
        return { text, background: slot.background, color: slot.color };
      });
    }

    // 홈
    const homeSelected: PreviewSlot[] = [];
    let hT = 0, hO = 0;
    if (hT < topicSlots.length) homeSelected.push(topicSlots[hT++]);
    else if (hO < otherSlots.length) homeSelected.push(otherSlots[hO++]);
    if (hO < otherSlots.length) homeSelected.push(otherSlots[hO++]);
    else if (hT < topicSlots.length) homeSelected.push(topicSlots[hT++]);

    // 목록
    const listSelected: PreviewSlot[] = [];
    let lT = 0, lK = 0, lO = 0;
    if (lT < topicSlots.length) listSelected.push(topicSlots[lT++]);
    if (lK < ksceneSlots.length) listSelected.push(ksceneSlots[lK++]);
    if (lO < otherSlots.length) listSelected.push(otherSlots[lO++]);
    if (listSelected.length < 3) {
      const remaining = [...topicSlots.slice(lT), ...ksceneSlots.slice(lK), ...otherSlots.slice(lO)];
      for (const slot of remaining) {
        if (listSelected.length >= 3) break;
        listSelected.push(slot);
      }
    }

    // 상세
    const detailLabels: PreviewLabel[] = [
      ...topicSlots.map((s) => ({ text: s.name, background: s.background, color: s.color })),
      ...ksceneSlots.map((s) => ({ text: s.name, background: s.background, color: s.color })),
      ...otherSlots.map((s) => ({ text: s.name, background: s.background, color: s.color })),
    ];

    return { home: applyText(homeSelected), list: applyText(listSelected), detail: detailLabels };
  }, [postTopics, postTags, topicMap, tagMap, topicEffectiveStyleMap, tagGroupMap]);

  // ─── 드래그 핸들러 ──────────────────────────────────────────────────────────

  const handleTopicDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visible = topicItems.filter((i) => i.isVisible);
    const oldIdx = visible.findIndex((i) => i.id === active.id);
    const newIdx = visible.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    arrayMove(visible, oldIdx, newIdx).forEach((item, idx) => {
      setPostTopics((prev) => prev.map((pt) => pt.topicId === item.id ? { ...pt, displayOrder: idx } : pt));
    });
  };

  const handleKsceneDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visible = ksceneItems.filter((i) => i.isVisible);
    const oldIdx = visible.findIndex((i) => i.id === active.id);
    const newIdx = visible.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    arrayMove(visible, oldIdx, newIdx).forEach((item, idx) => {
      setPostTags((prev) => prev.map((pt) => pt.tagId === item.id ? { ...pt, displayOrder: idx } : pt));
    });
  };

  const handleOtherDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visible = otherTagItems.filter((i) => i.isVisible);
    const oldIdx = visible.findIndex((i) => i.id === active.id);
    const newIdx = visible.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    arrayMove(visible, oldIdx, newIdx).forEach((item, idx) => {
      setPostTags((prev) => prev.map((pt) => pt.tagId === item.id ? { ...pt, displayOrder: idx } : pt));
    });
  };

  if (postTopics.length === 0 && postTags.length === 0) return null;

  return (
    <Card className="gap-3 py-4 border-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">라벨 표시 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── 미리보기 ── */}
        <PreviewSection preview={preview} />

        {/* ── 토픽 ── */}
        <GroupSection
          title="토픽"
          dndId="label-topics-dnd"
          items={topicItems}
          sensors={sensors}
          onToggle={(id) => setPostTopics((prev) => prev.map((pt) => pt.topicId === id ? { ...pt, isVisible: !pt.isVisible } : pt))}
          onDragEnd={handleTopicDragEnd}
        />

        {/* ── K-MEDIA 태그 ── */}
        <GroupSection
          title="K-MEDIA 태그"
          dndId="label-kscene-dnd"
          items={ksceneItems}
          sensors={sensors}
          onToggle={(id) => setPostTags((prev) => prev.map((pt) => pt.tagId === id ? { ...pt, isVisible: !pt.isVisible } : pt))}
          onDragEnd={handleKsceneDragEnd}
        />

        {/* ── 나머지 태그 ── */}
        <GroupSection
          title="나머지 태그"
          dndId="label-other-dnd"
          items={otherTagItems}
          sensors={sensors}
          onToggle={(id) => setPostTags((prev) => prev.map((pt) => pt.tagId === id ? { ...pt, isVisible: !pt.isVisible } : pt))}
          onDragEnd={handleOtherDragEnd}
        />

      </CardContent>
    </Card>
  );
}
