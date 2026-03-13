"use client";

import { useState, useTransition, useId, useEffect } from "react";
import Image from "next/image";
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
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  addBanner,
  removeBanner,
  reorderBanners,
  toggleBannerActive,
  type LabelOverride,
} from "../_actions/home-curation-actions";
import { PostPickerDialog, type PickablePost } from "./PostPickerDialog";
import { BannerLabelDialog } from "./BannerLabelDialog";
import { PostEditSheet } from "./PostEditSheet";

export type BannerLabelItem = {
  topicId?: string;
  tagId?: string;
  nameEn?: string;
  name?: string;
  isVisible: boolean;
  effectiveColorHex: string;
  effectiveTextColorHex: string;
};

export type BannerRow = {
  id: string;
  postId: string;
  order: number;
  isActive: boolean;
  labelOverrides: LabelOverride[] | null;
  post: {
    slug: string;
    titleEn: string;
    thumbnailUrl: string | null; // postImages[0]?.url ?? null로 매핑됨
  };
  postTopics: {
    topicId: string;
    nameEn: string;
    isVisible: boolean;
    effectiveColorHex: string;
    effectiveTextColorHex: string;
  }[];
  postTags: {
    tagId: string;
    name: string;
    isVisible: boolean;
    effectiveColorHex: string;
    effectiveTextColorHex: string;
  }[];
};

function SortableBannerRow({
  banner,
  onRemove,
  onToggle,
  onLabelEdit,
  onEdit,
}: {
  banner: BannerRow;
  onRemove: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
  onLabelEdit: (banner: BannerRow) => void;
  onEdit: (postId: string) => void;
}) {
  const [handleHovered, setHandleHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const hasOverrides = banner.labelOverrides !== null && banner.labelOverrides.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row flex items-center gap-3 border-b border-border/30 last:border-0 py-2 px-2 rounded transition-colors ${
        handleHovered || isDragging ? "bg-muted/40" : ""
      }`}
    >
      <span
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="size-4" />
      </span>

      <div className="relative w-14 h-[38px] rounded overflow-hidden shrink-0 bg-muted">
        {banner.post.thumbnailUrl && (
          <Image
            src={banner.post.thumbnailUrl}
            alt={banner.post.titleEn}
            fill
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => onEdit(banner.postId)}
        className="flex-1 text-sm font-medium truncate min-w-0 text-left hover:underline"
      >
        {banner.post.titleEn}
      </button>

      {hasOverrides && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          커스텀 ({banner.labelOverrides!.length}개)
        </span>
      )}

      <button
        type="button"
        onClick={() => onLabelEdit(banner)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="라벨 편집"
        title="라벨 편집"
      >
        <Tag className="size-4" />
      </button>

      <Switch
        checked={banner.isActive}
        onCheckedChange={(v) => onToggle(banner.id, v)}
        className="shrink-0"
      />

      <button
        type="button"
        onClick={() => onRemove(banner.id)}
        className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
        aria-label="삭제"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function BannerTab({
  initialBanners,
  publishedPosts,
}: {
  initialBanners: BannerRow[];
  publishedPosts: PickablePost[];
}) {
  const [banners, setBanners] = useState(initialBanners);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labelDialogBanner, setLabelDialogBanner] = useState<BannerRow | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dndId = useId();

  useEffect(() => {
    setBanners(initialBanners);
  }, [initialBanners]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = banners.findIndex((b) => b.id === active.id);
    const newIdx = banners.findIndex((b) => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(banners, oldIdx, newIdx);
    setBanners(next);
    startTransition(() => reorderBanners(next.map((b) => b.id)));
  }

  function handleToggle(id: string, isActive: boolean) {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive } : b))
    );
    startTransition(() => toggleBannerActive(id, isActive));
  }

  function handleRemove(id: string) {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    startTransition(() => removeBanner(id));
  }

  const MAX_BANNERS = 10;

  function handleAdd(ids: string[]) {
    startTransition(async () => {
      await Promise.all(ids.map(addBanner));
    });
  }

  // 이미 배너에 있는 포스트는 선택에서 제외
  const existingPostIds = new Set(banners.map((b) => b.postId));
  const availablePosts = publishedPosts.filter((p) => !existingPostIds.has(p.id));

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          드래그로 순서를 변경합니다. 최대 {MAX_BANNERS}개까지 추가할 수 있습니다.
        </p>
        <Button
          size="sm"
          onClick={() => setPickerOpen(true)}
          disabled={banners.length >= MAX_BANNERS}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          배너 추가 ({banners.length}/{MAX_BANNERS})
        </Button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
          배너가 없습니다. 포스트를 추가해 주세요.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={banners.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {banners.map((banner) => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  onRemove={handleRemove}
                  onToggle={handleToggle}
                  onLabelEdit={setLabelDialogBanner}
                  onEdit={setEditingPostId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <PostPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        posts={availablePosts}
        selectedIds={[]}
        maxSelect={MAX_BANNERS - banners.length}
        onConfirm={handleAdd}
      />

      {labelDialogBanner && (
        <BannerLabelDialog
          open={true}
          onClose={() => setLabelDialogBanner(null)}
          bannerId={labelDialogBanner.id}
          postTopics={labelDialogBanner.postTopics}
          postTags={labelDialogBanner.postTags}
          initialOverrides={labelDialogBanner.labelOverrides}
        />
      )}

      <PostEditSheet
        postId={editingPostId}
        onClose={() => setEditingPostId(null)}
      />
    </div>
  );
}
