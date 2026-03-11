"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, X, GripVertical, ImageIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PostImageInput, PostSourceInput } from "../_actions/post-actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BANNER = 5;

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([^?&"'\s]{11})/,
  );
  return match?.[1] ?? null;
}

async function uploadImage(
  file: File,
  path: string,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: `${file.name}: jpg, png, webp 형식만 지원합니다.` };
  }
  if (file.size > MAX_SIZE) {
    return { error: `${file.name}: 파일 크기가 5MB를 초과합니다.` };
  }
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const fullPath = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("post-images").upload(fullPath, file);
  if (error) return { error: `업로드 실패: ${error.message}` };
  const { data } = supabase.storage.from("post-images").getPublicUrl(fullPath);
  return { url: data.publicUrl };
}

// ─── 정렬 가능한 배너 아이템 ─────────────────────────────────────────────────────

function SortableBannerItem({
  image,
  onRemove,
  onSetThumb,
}: {
  image: PostImageInput;
  onRemove: () => void;
  onSetThumb: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.url });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "relative group w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0",
        image.isThumbnail ? "border-brand" : "border-transparent hover:border-zinc-300",
      )}
      onClick={onSetThumb}
    >
      <img src={image.url} alt="" className="w-full h-full object-cover" />

      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 cursor-grab"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-white" />
      </div>

      {/* 삭제 버튼 */}
      <button
        type="button"
        className="absolute top-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="h-3 w-3" />
      </button>

      {image.isThumbnail && (
        <div className="absolute bottom-0 inset-x-0 bg-brand/90 text-black text-[10px] text-center py-0.5 font-medium">
          썸네일
        </div>
      )}
    </div>
  );
}

// ─── PostImageSection ─────────────────────────────────────────────────────────

interface Props {
  postId?: string;
  images: PostImageInput[];
  onChange: (images: PostImageInput[]) => void;
  sources: PostSourceInput[];
}

export function PostImageSection({ postId, images, onChange, sources }: Props) {
  const bannerImages = images.filter((img) => img.imageType === "BANNER");
  const originalImage = images.find((img) => img.imageType === "ORIGINAL") ?? null;

  const [bannerUploading, setBannerUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // YouTube 출처에서 자동 추출 (isOriginalLink: true 우선, 없으면 첫 번째 YouTube)
  const ytUrl = (
    sources.find((s) => s.isOriginalLink && s.platform?.toUpperCase() === "YOUTUBE" && s.url) ??
    sources.find((s) => s.platform?.toUpperCase() === "YOUTUBE" && s.url)
  )?.url;
  const ytVideoId = ytUrl ? extractYouTubeVideoId(ytUrl) : null;
  const ytThumbUrl = ytVideoId
    ? `https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`
    : null;

  // 전체 이미지 배열 교체 — isThumbnail 자동 보정 포함
  const replaceImages = useCallback(
    (newBanners: PostImageInput[], newOriginal: PostImageInput | null) => {
      const result: PostImageInput[] = [
        ...newBanners.map((img, i) => ({ ...img, sortOrder: i })),
        ...(newOriginal ? [newOriginal] : []),
      ];
      const hasThumb = result.some((img) => img.isThumbnail);
      if (!hasThumb && result.length > 0) {
        const preferred = result.find((img) => img.imageType === "ORIGINAL") ?? result[0];
        onChange(result.map((img) => ({ ...img, isThumbnail: img === preferred })));
      } else {
        onChange(result);
      }
    },
    [onChange],
  );

  // 썸네일 지정
  function setThumbnail(url: string) {
    onChange(images.map((img) => ({ ...img, isThumbnail: img.url === url })));
  }

  // 배너 업로드
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (bannerImages.length + files.length > MAX_BANNER) {
      toast.error(`배너 이미지는 최대 ${MAX_BANNER}장까지 등록할 수 있습니다.`);
      return;
    }
    setBannerUploading(true);
    const newBanners = [...bannerImages];
    try {
      for (const file of files) {
        const result = await uploadImage(file, `banner/${postId ?? "new"}`);
        if ("error" in result) { toast.error(result.error); continue; }
        newBanners.push({
          imageType: "BANNER",
          imageSource: "UPLOAD",
          url: result.url,
          isThumbnail: false,
          sortOrder: newBanners.length,
        });
      }
      replaceImages(newBanners, originalImage);
    } finally {
      setBannerUploading(false);
    }
  }

  // 배너 삭제
  function removeBanner(url: string) {
    const newBanners = bannerImages.filter((img) => img.url !== url);
    replaceImages(newBanners, originalImage);
  }

  // 배너 드래그 순서 변경
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = bannerImages.findIndex((b) => b.url === active.id);
    const newIdx = bannerImages.findIndex((b) => b.url === over.id);
    replaceImages(arrayMove(bannerImages, oldIdx, newIdx), originalImage);
  }

  // 원본 이미지 설정
  function setOriginal(img: PostImageInput | null) {
    replaceImages(bannerImages, img);
  }

  // 원본 이미지 업로드
  async function handleOriginalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await uploadImage(file, `original/${postId ?? "new"}`);
    if ("error" in result) { toast.error(result.error); return; }
    setOriginal({ imageType: "ORIGINAL", imageSource: "UPLOAD", url: result.url, isThumbnail: false, sortOrder: 0 });
  }

  const thumbImage = images.find((img) => img.isThumbnail);

  return (
    <div className="space-y-6">

      {/* ─ 배너 이미지 ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">배너 이미지</span>
          <span className="text-xs text-muted-foreground">({bannerImages.length}/{MAX_BANNER}장)</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap min-h-[96px]">
          {bannerImages.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={bannerImages.map((img) => img.url)}
                strategy={horizontalListSortingStrategy}
              >
                {bannerImages.map((img) => (
                  <SortableBannerItem
                    key={img.url}
                    image={img}
                    onRemove={() => removeBanner(img.url)}
                    onSetThumb={() => setThumbnail(img.url)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex items-center justify-center w-24 h-24 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}

          {bannerImages.length < MAX_BANNER && (
            <label
              className={cn(
                "flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed cursor-pointer shrink-0 transition-colors",
                bannerUploading ? "opacity-50 cursor-not-allowed" : "hover:border-zinc-400",
              )}
            >
              {bannerUploading ? (
                <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-zinc-400 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">추가</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={bannerUploading}
                onChange={handleBannerUpload}
              />
            </label>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">드래그로 순서 변경 · 이미지 클릭 시 썸네일 지정</p>
      </div>

      {/* ─ 원본 이미지 ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">원본 이미지</span>
          <span className="text-xs text-muted-foreground">(연예인 장면, 1장)</span>
        </div>

        {originalImage ? (
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "relative w-32 h-24 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0",
                originalImage.isThumbnail
                  ? "border-brand"
                  : "border-transparent hover:border-zinc-300",
              )}
              onClick={() => setThumbnail(originalImage.url)}
            >
              <img src={originalImage.url} alt="" className="w-full h-full object-cover" />
              {originalImage.isThumbnail && (
                <div className="absolute bottom-0 inset-x-0 bg-brand/90 text-black text-[10px] text-center py-0.5 font-medium">
                  썸네일
                </div>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOriginal(null)}>
              <X className="h-3.5 w-3.5 mr-1" />
              제거
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {ytThumbUrl && (
                <button
                  type="button"
                  onClick={() => setOriginal({
                    imageType: "ORIGINAL",
                    imageSource: "AUTO",
                    url: ytThumbUrl,
                    isThumbnail: false,
                    sortOrder: 0,
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors"
                >
                  YouTube 자동 추출
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors",
                  showUrlInput ? "bg-muted" : "hover:bg-muted",
                )}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL 입력
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border cursor-pointer hover:bg-muted transition-colors">
                <Upload className="h-3.5 w-3.5" />
                파일 업로드
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleOriginalUpload}
                />
              </label>
            </div>

            {showUrlInput && (
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={!urlInput.trim()}
                  onClick={() => {
                    setOriginal({
                      imageType: "ORIGINAL",
                      imageSource: "URL",
                      url: urlInput.trim(),
                      isThumbnail: false,
                      sortOrder: 0,
                    });
                    setUrlInput("");
                    setShowUrlInput(false);
                  }}
                >
                  적용
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─ 현재 썸네일 ─────────────────────────────────────────────────────── */}
      {thumbImage && (
        <div className="pt-3 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">현재 썸네일</p>
          <div className="relative w-40 aspect-[3/2] rounded-lg overflow-hidden border">
            <img src={thumbImage.url} alt="썸네일" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
