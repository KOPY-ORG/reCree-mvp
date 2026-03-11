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

type SlotMode = "idle" | "url" | "youtube";

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

      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 cursor-grab"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-white" />
      </div>

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

// ─── 슬롯 이미지 카드 ─────────────────────────────────────────────────────────

function SlotImageCard({
  image,
  onRemove,
  onSetSlotCard,
  onSetThumb,
}: {
  image: PostImageInput;
  onRemove: () => void;
  onSetSlotCard: () => void;
  onSetThumb: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 shrink-0 w-32">
      {/* 이미지 */}
      <div className="relative group w-32 h-24 rounded-lg overflow-hidden border">
        <img src={image.url} alt="" className="w-full h-full object-cover" />
        <button
          type="button"
          className="absolute top-1 right-1 p-0.5 rounded bg-black/50 opacity-0 group-hover:opacity-100 text-white"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* 카드 / 썸네일 버튼 */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onSetSlotCard}
          className={cn(
            "flex-1 text-[10px] py-0.5 rounded border font-medium transition-colors",
            image.isSlotCard
              ? "bg-sky-400 border-sky-400 text-white"
              : "border-zinc-300 text-zinc-500 hover:border-sky-300 hover:text-sky-500",
          )}
        >
          카드
        </button>
        <button
          type="button"
          onClick={onSetThumb}
          className={cn(
            "flex-1 text-[10px] py-0.5 rounded border font-medium transition-colors",
            image.isThumbnail
              ? "bg-brand border-brand text-black"
              : "border-zinc-300 text-zinc-500 hover:border-brand hover:text-zinc-700",
          )}
        >
          썸네일
        </button>
      </div>
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
  const slot0Images  = images.filter((img) => img.slotIndex === 0);
  const slot1Images  = images.filter((img) => img.slotIndex === 1);

  const [bannerUploading, setBannerUploading] = useState(false);
  const [slotMode, setSlotMode] = useState<[SlotMode, SlotMode]>(["idle", "idle"]);
  const [urlInput, setUrlInput] = useState<[string, string]>(["", ""]);
  const [linkUrlInput, setLinkUrlInput] = useState<[string, string]>(["", ""]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ytSources = sources
    .filter((s) => s.platform?.toUpperCase() === "YOUTUBE" && s.url)
    .map((s, i) => ({
      url: s.url,
      videoId: extractYouTubeVideoId(s.url),
      sortOrder: i,
    }))
    .filter((s): s is { url: string; videoId: string; sortOrder: number } => s.videoId !== null);

  // ─ 이미지 교체 (배너 + 슬롯 전체 갱신) ────────────────────────────────────

  const replaceImages = useCallback(
    (newBanners: PostImageInput[], allNonBanners: PostImageInput[], forceThumbUrl?: string) => {
      const result: PostImageInput[] = [
        ...newBanners.map((img, i) => ({ ...img, sortOrder: i })),
        ...allNonBanners,
      ];
      if (forceThumbUrl) {
        onChange(result.map((img) => ({ ...img, isThumbnail: img.url === forceThumbUrl })));
      } else {
        const hasThumb = result.some((img) => img.isThumbnail);
        if (!hasThumb && result.length > 0) {
          const preferred = result.find((img) => img.imageType === "ORIGINAL") ?? result[0];
          onChange(result.map((img) => ({ ...img, isThumbnail: img === preferred })));
        } else {
          onChange(result);
        }
      }
    },
    [onChange],
  );

  // ─ 썸네일 지정 ─────────────────────────────────────────────────────────────

  function setThumbnail(url: string) {
    onChange(images.map((img) => ({ ...img, isThumbnail: img.url === url })));
  }

  // ─ 슬롯 이미지 추가 ────────────────────────────────────────────────────────

  function addSlotImage(slotIndex: number, newImg: Omit<PostImageInput, "slotIndex" | "isSlotCard" | "sortOrder">) {
    const slotImages = slotIndex === 0 ? slot0Images : slot1Images;
    const otherSlotImages = slotIndex === 0 ? slot1Images : slot0Images;

    const isFirst = slotImages.length === 0;
    const added: PostImageInput = {
      ...newImg,
      slotIndex,
      isSlotCard: isFirst, // 첫 번째 이미지는 자동으로 슬롯 카드 지정
      sortOrder: slotImages.length,
    };

    const newSlotImages = [...slotImages, added];
    const allNonBanners = slotIndex === 0
      ? [...newSlotImages, ...otherSlotImages]
      : [...otherSlotImages, ...newSlotImages];

    replaceImages(bannerImages, allNonBanners);
  }

  // ─ 슬롯 이미지 제거 ────────────────────────────────────────────────────────

  function removeSlotImage(slotIndex: number, url: string) {
    const slotImages = slotIndex === 0 ? slot0Images : slot1Images;
    const otherSlotImages = slotIndex === 0 ? slot1Images : slot0Images;

    const removedImg = slotImages.find((img) => img.url === url);
    const filtered = slotImages.filter((img) => img.url !== url);

    // 제거된 이미지가 슬롯 카드였다면 첫 번째 남은 이미지로 이전
    let newSlotImages = filtered;
    if (removedImg?.isSlotCard && filtered.length > 0) {
      newSlotImages = filtered.map((img, i) => ({ ...img, isSlotCard: i === 0 }));
    }

    const allNonBanners = slotIndex === 0
      ? [...newSlotImages, ...otherSlotImages]
      : [...otherSlotImages, ...newSlotImages];

    replaceImages(bannerImages, allNonBanners);
  }

  // ─ 슬롯 카드 지정 ──────────────────────────────────────────────────────────

  function setSlotCard(slotIndex: number, url: string) {
    const slotImages = slotIndex === 0 ? slot0Images : slot1Images;
    const otherSlotImages = slotIndex === 0 ? slot1Images : slot0Images;

    const newSlotImages = slotImages.map((img) => ({ ...img, isSlotCard: img.url === url }));
    const allNonBanners = slotIndex === 0
      ? [...newSlotImages, ...otherSlotImages]
      : [...otherSlotImages, ...newSlotImages];

    replaceImages(bannerImages, allNonBanners);
  }

  // ─ 배너 관련 ───────────────────────────────────────────────────────────────

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
      replaceImages(newBanners, [...slot0Images, ...slot1Images]);
    } finally {
      setBannerUploading(false);
    }
  }

  function removeBanner(url: string) {
    const newBanners = bannerImages.filter((img) => img.url !== url);
    replaceImages(newBanners, [...slot0Images, ...slot1Images]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = bannerImages.findIndex((b) => b.url === active.id);
    const newIdx = bannerImages.findIndex((b) => b.url === over.id);
    replaceImages(arrayMove(bannerImages, oldIdx, newIdx), [...slot0Images, ...slot1Images]);
  }

  function setMode(slotIndex: number, mode: SlotMode) {
    setSlotMode((prev) => {
      const next: [SlotMode, SlotMode] = [...prev] as [SlotMode, SlotMode];
      next[slotIndex] = mode;
      return next;
    });
  }

  // ─ 슬롯별 YouTube 자동추출 버튼 대상 (해당 슬롯 sortOrder에 매핑) ──────────

  function getSlotYtSource(slotIndex: number) {
    return ytSources[slotIndex] ?? null;
  }

  // ─ 슬롯 렌더 ───────────────────────────────────────────────────────────────

  function renderSlot(slotIndex: number) {
    const slotImages = slotIndex === 0 ? slot0Images : slot1Images;
    const slotLabel = slotIndex === 0 ? "슬롯 1" : "슬롯 2";
    const mode = slotMode[slotIndex];
    const ytSource = getSlotYtSource(slotIndex);

    return (
      <div key={slotIndex} className="space-y-2 border rounded-lg p-3 bg-muted/20">
        {/* 슬롯 헤더 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{slotLabel}</span>
          {ytSource && (
            <span className="text-[10px] text-sky-500">출처 {slotIndex + 1} 연결됨</span>
          )}
        </div>

        {/* 이미지 목록 (가로 스크롤) */}
        {slotImages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {slotImages.map((img) => (
              <SlotImageCard
                key={img.url}
                image={img}
                onRemove={() => removeSlotImage(slotIndex, img.url)}
                onSetSlotCard={() => setSlotCard(slotIndex, img.url)}
                onSetThumb={() => setThumbnail(img.url)}
              />
            ))}
          </div>
        )}

        {/* 추가 버튼 */}
        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            {/* YouTube 자동추출 — 해당 슬롯에 연결된 YouTube 출처가 있을 때만 */}
            {ytSource && !slotImages.some((img) => img.imageSource === "AUTO" && img.linkUrl === ytSource.url) && (
              <button
                type="button"
                onClick={() => {
                  addSlotImage(slotIndex, {
                    imageType: "ORIGINAL",
                    imageSource: "AUTO",
                    url: `https://img.youtube.com/vi/${ytSource.videoId}/maxresdefault.jpg`,
                    linkUrl: ytSource.url,
                    isThumbnail: false,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors text-sky-600 border-sky-200"
              >
                YouTube 자동추출
              </button>
            )}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border cursor-pointer hover:bg-muted transition-colors">
              <Upload className="h-3.5 w-3.5" />
              파일 업로드
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const result = await uploadImage(file, `original/${postId ?? "new"}`);
                  if ("error" in result) { toast.error(result.error); return; }
                  addSlotImage(slotIndex, {
                    imageType: "ORIGINAL",
                    imageSource: "UPLOAD",
                    url: result.url,
                    linkUrl: null,
                    isThumbnail: false,
                  });
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setMode(slotIndex, "url")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              URL 입력
            </button>
          </div>
        ) : (
          // URL 입력 폼
          <div className="space-y-1.5">
            <Input
              value={urlInput[slotIndex]}
              onChange={(e) =>
                setUrlInput((prev) => {
                  const next: [string, string] = [...prev] as [string, string];
                  next[slotIndex] = e.target.value;
                  return next;
                })
              }
              placeholder="이미지 URL (https://...)"
              className="h-8 text-sm"
            />
            <Input
              value={linkUrlInput[slotIndex]}
              onChange={(e) =>
                setLinkUrlInput((prev) => {
                  const next: [string, string] = [...prev] as [string, string];
                  next[slotIndex] = e.target.value;
                  return next;
                })
              }
              placeholder="클릭 링크 URL (선택, https://...)"
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={!urlInput[slotIndex].trim()}
                onClick={() => {
                  addSlotImage(slotIndex, {
                    imageType: "ORIGINAL",
                    imageSource: "URL",
                    url: urlInput[slotIndex].trim(),
                    linkUrl: linkUrlInput[slotIndex].trim() || null,
                    isThumbnail: false,
                  });
                  setUrlInput((prev) => { const n = [...prev] as [string, string]; n[slotIndex] = ""; return n; });
                  setLinkUrlInput((prev) => { const n = [...prev] as [string, string]; n[slotIndex] = ""; return n; });
                  setMode(slotIndex, "idle");
                }}
              >
                적용
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setMode(slotIndex, "idle")}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </div>
    );
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

      {/* ─ 원본/출처 이미지 (슬롯별) ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">원본/출처 이미지</span>
          <span className="text-xs text-muted-foreground">
            (슬롯별 여러 장 가능)
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          카드 = 사용자 페이지 미니 소스 카드 · 썸네일 = 포스트 목록 대표 이미지
        </p>

        <div className="space-y-2">
          {renderSlot(0)}
          {renderSlot(1)}
        </div>
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
