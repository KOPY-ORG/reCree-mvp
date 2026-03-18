"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, X, GripVertical, ImageIcon, Crosshair, MapPin, Crop } from "lucide-react";
import { ReCreeshotCropDialog } from "./ReCreeshotCropDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PostImageInput, PostSourceInput } from "../_actions/post-actions";
import { getPlaceImages } from "../_actions/post-actions";
import { ImageFocalPointDialog } from "./ImageFocalPointDialog";

type PlaceImageItem = { id: string; url: string; isThumbnail: boolean; caption: string | null };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_BANNER = 5;
const NONE_VALUE = "__none__";
const CUSTOM_VALUE = "__custom__";

type OriginalMode = "idle" | "url";

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([^?&"'\s]{11})/,
  );
  return match?.[1] ?? null;
}

function getPlatformShort(platform: string): string {
  const map: Record<string, string> = {
    YOUTUBE: "YouTube", INSTAGRAM: "Instagram", X: "X",
    PINTEREST: "Pinterest", BLOG: "Blog", ARTICLE: "기사", OTHER: "기타",
  };
  return map[platform?.toUpperCase()] ?? platform ?? "URL";
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

// ─── 배너 아이템 (드래그 정렬) ────────────────────────────────────────────────

function SortableBannerItem({
  image,
  onRemove,
  onSetThumb,
  onEditFocal,
}: {
  image: PostImageInput;
  onRemove: () => void;
  onSetThumb: () => void;
  onEditFocal: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        "relative group w-32 aspect-[3/2] rounded-lg overflow-hidden border-[3px] cursor-pointer shrink-0",
        image.isThumbnail ? "border-brand" : "border-transparent hover:border-zinc-300",
      )}
      onClick={onSetThumb}
    >
      <img
        src={image.url}
        alt=""
        className="w-full h-full object-cover"
        style={{ objectPosition: `${(image.focalX ?? 0.5) * 100}% ${(image.focalY ?? 0.5) * 100}%` }}
      />
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
      <button
        type="button"
        className="absolute bottom-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
        onClick={(e) => { e.stopPropagation(); onEditFocal(); }}
        title="초점 설정"
      >
        <Crosshair className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── 클릭 링크 선택기 ─────────────────────────────────────────────────────────

function LinkSelector({
  linkUrl,
  sources,
  onChange,
}: {
  linkUrl: string | null;
  sources: PostSourceInput[];
  onChange: (url: string | null) => void;
}) {
  const sourceUrls = sources.filter((s) => s.url);
  const isCustom = !!linkUrl && !sourceUrls.find((s) => s.url === linkUrl);
  const [customInput, setCustomInput] = useState(isCustom ? (linkUrl ?? "") : "");
  const selectValue = isCustom ? CUSTOM_VALUE : (linkUrl ?? NONE_VALUE);

  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === NONE_VALUE) {
            onChange(null);
          } else if (v === CUSTOM_VALUE) {
            onChange(customInput || null);
          } else {
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="링크 없음" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>없음</SelectItem>
          {sourceUrls.map((s, i) => {
            const ytId = s.platform?.toUpperCase() === "YOUTUBE" ? extractYouTubeVideoId(s.url) : null;
            return (
              <SelectItem key={i} value={s.url}>
                <div className="flex items-center gap-2">
                  {ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                      alt=""
                      className="w-10 h-6 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-6 rounded bg-muted flex items-center justify-center shrink-0 text-[9px] text-muted-foreground font-medium">
                      {getPlatformShort(s.platform).slice(0, 2)}
                    </div>
                  )}
                  <span>출처 {i + 1}</span>
                  {s.sourceNote && (
                    <span className="text-muted-foreground text-xs">· {s.sourceNote}</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
          <SelectItem value={CUSTOM_VALUE}>직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {(isCustom || selectValue === CUSTOM_VALUE) && (
        <Input
          value={customInput}
          onChange={(e) => {
            setCustomInput(e.target.value);
            onChange(e.target.value || null);
          }}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}

// ─── PostImageSection ─────────────────────────────────────────────────────────

interface Props {
  postId?: string;
  placeId?: string | null;
  images: PostImageInput[];
  onChange: (images: PostImageInput[]) => void;
  sources: PostSourceInput[];
  recreePhotoUrl: string | null;
  onRecreePhotoChange: (url: string | null) => void;
}

export function PostImageSection({ postId, placeId, images, onChange, sources, recreePhotoUrl, onRecreePhotoChange }: Props) {
  const bannerImages   = images.filter((img) => img.imageType === "BANNER");
  const originalImage  = images.find((img) => img.imageType === "ORIGINAL") ?? null;

  const [bannerUploading, setBannerUploading] = useState(false);
  const [originalMode, setOriginalMode] = useState<OriginalMode>("idle");
  const [reCreeCropSrc, setReCreeCropSrc] = useState<string | null>(null);
  const [recreeUploading, setRecreeUploading] = useState(false);
  const [placeImages, setPlaceImages] = useState<PlaceImageItem[]>([]);

  useEffect(() => {
    if (!placeId) { setPlaceImages([]); return; }
    getPlaceImages(placeId).then(setPlaceImages);
  }, [placeId]);
  const [urlInput, setUrlInput] = useState("");
  const [focalDialog, setFocalDialog] = useState<{
    url: string;
    focalX: number | null;
    focalY: number | null;
  } | null>(null);

  function updateFocal(url: string, focalX: number, focalY: number) {
    onChange(images.map((img) => img.url === url ? { ...img, focalX, focalY } : img));
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ytSources = sources
    .filter((s) => s.platform?.toUpperCase() === "YOUTUBE" && s.url)
    .map((s) => ({ url: s.url, videoId: extractYouTubeVideoId(s.url) }))
    .filter((s): s is { url: string; videoId: string } => s.videoId !== null);

  // ─ 이미지 교체 헬퍼 ────────────────────────────────────────────────────────

  const replaceImages = useCallback(
    (newBanners: PostImageInput[], newOriginal: PostImageInput | null, forceThumbUrl?: string) => {
      const result: PostImageInput[] = [
        ...newBanners.map((img, i) => ({ ...img, sortOrder: i })),
        ...(newOriginal ? [{ ...newOriginal, sortOrder: 0 }] : []),
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

  function setThumbnail(url: string) {
    onChange(images.map((img) => ({ ...img, isThumbnail: img.url === url })));
  }

  function setOriginal(img: PostImageInput) {
    replaceImages(bannerImages, img, img.url);
  }

  function removeOriginal() {
    replaceImages(bannerImages, null);
  }

  function setOriginalLinkUrl(linkUrl: string | null) {
    if (!originalImage) return;
    onChange(images.map((img) =>
      img.imageType === "ORIGINAL" ? { ...img, linkUrl } : img,
    ));
  }

  // ─ 배너 핸들러 ─────────────────────────────────────────────────────────────

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
        newBanners.push({ imageType: "BANNER", imageSource: "UPLOAD", url: result.url, isThumbnail: false, sortOrder: newBanners.length });
      }
      replaceImages(newBanners, originalImage);
    } finally {
      setBannerUploading(false);
    }
  }

  function removeBanner(url: string) {
    replaceImages(bannerImages.filter((img) => img.url !== url), originalImage);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = bannerImages.findIndex((b) => b.url === active.id);
    const newIdx = bannerImages.findIndex((b) => b.url === over.id);
    replaceImages(arrayMove(bannerImages, oldIdx, newIdx), originalImage);
  }

  const thumbImage = images.find((img) => img.isThumbnail);
  const thumbSource = thumbImage?.imageType === "BANNER" ? "배너" : thumbImage?.imageType === "ORIGINAL" ? "소스 이미지" : null;

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={bannerImages.map((img) => img.url)} strategy={horizontalListSortingStrategy}>
                {bannerImages.map((img) => (
                  <SortableBannerItem
                    key={img.url}
                    image={img}
                    onRemove={() => removeBanner(img.url)}
                    onSetThumb={() => setThumbnail(img.url)}
                    onEditFocal={() => setFocalDialog({ url: img.url, focalX: img.focalX ?? null, focalY: img.focalY ?? null })}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex items-center justify-center w-32 aspect-[3/2] rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}

          {bannerImages.length < MAX_BANNER && (
            <label className={cn(
              "flex flex-col items-center justify-center w-32 aspect-[3/2] rounded-lg border-2 border-dashed cursor-pointer shrink-0 transition-colors",
              bannerUploading ? "opacity-50 cursor-not-allowed" : "hover:border-zinc-400",
            )}>
              {bannerUploading
                ? <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-zinc-400 animate-spin" />
                : <><Upload className="h-4 w-4 text-muted-foreground mb-1" /><span className="text-[10px] text-muted-foreground">추가</span></>
              }
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={bannerUploading} onChange={handleBannerUpload} />
            </label>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">드래그로 순서 변경 · 클릭 시 썸네일 지정</p>

        {/* 장소 사진에서 가져오기 */}
        {placeImages.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <MapPin className="h-3 w-3" />
              장소 사진에서 가져오기
            </p>
            <div className="flex gap-2 flex-wrap">
              {placeImages.map((img) => {
                const alreadyAdded = bannerImages.some((b) => b.url === img.url);
                return (
                  <button
                    key={img.id}
                    type="button"
                    disabled={alreadyAdded || bannerImages.length >= MAX_BANNER}
                    onClick={() => {
                      const newBanners = [
                        ...bannerImages,
                        {
                          imageType: "BANNER" as const,
                          imageSource: "URL" as const,
                          url: img.url,
                          isThumbnail: false,
                          sortOrder: bannerImages.length,
                        },
                      ];
                      replaceImages(newBanners, originalImage);
                    }}
                    title={img.caption ?? undefined}
                    className={cn(
                      "relative w-20 aspect-[3/2] rounded-md overflow-hidden border-2 shrink-0 transition-all",
                      alreadyAdded
                        ? "border-brand opacity-50 cursor-default"
                        : bannerImages.length >= MAX_BANNER
                        ? "opacity-30 cursor-not-allowed border-transparent"
                        : "border-transparent hover:border-zinc-400 cursor-pointer",
                    )}
                  >
                    <img src={img.url} alt={img.caption ?? ""} className="w-full h-full object-cover" />
                    {alreadyAdded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-white text-[9px] font-bold">추가됨</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─ 소스 이미지 (1장) ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">소스 이미지</span>
          <span className="text-xs text-muted-foreground">(사용자 페이지 미니 카드 · 1장)</span>
        </div>

        <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
          {originalImage ? (
            // 이미지 있는 경우 — 이미지 + 클릭 링크를 나란히
            <div className="flex gap-4 items-start">
              <div
                className={cn(
                  "relative group w-32 aspect-[3/2] rounded-lg overflow-hidden border-[3px] cursor-pointer shrink-0",
                  originalImage.isThumbnail ? "border-brand" : "border-transparent hover:border-zinc-300",
                )}
                onClick={() => setThumbnail(originalImage.url)}
              >
                <img
                  src={originalImage.url}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${(originalImage.focalX ?? 0.5) * 100}% ${(originalImage.focalY ?? 0.5) * 100}%` }}
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
                  onClick={(e) => { e.stopPropagation(); removeOriginal(); }}
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="absolute bottom-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
                  onClick={(e) => { e.stopPropagation(); setFocalDialog({ url: originalImage.url, focalX: originalImage.focalX ?? null, focalY: originalImage.focalY ?? null }); }}
                  title="초점 설정"
                >
                  <Crosshair className="h-3 w-3" />
                </button>
              </div>

              {/* 클릭 링크 선택 */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-xs font-medium">클릭 링크</p>
                <p className="text-[11px] text-muted-foreground">사용자가 카드 클릭 시 이동할 URL</p>
                <LinkSelector
                  linkUrl={originalImage.linkUrl ?? null}
                  sources={sources}
                  onChange={setOriginalLinkUrl}
                />
              </div>
            </div>
          ) : originalMode === "idle" ? (
            // 비어있는 상태 — 추가 버튼
            <div className="flex flex-wrap gap-2">
              {ytSources.map((yt, i) => (
                <button
                  key={yt.url}
                  type="button"
                  onClick={() => setOriginal({
                    imageType: "ORIGINAL",
                    imageSource: "AUTO",
                    url: `https://img.youtube.com/vi/${yt.videoId}/maxresdefault.jpg`,
                    linkUrl: yt.url,
                    isThumbnail: false,
                    sortOrder: 0,
                  })}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors text-sky-600 border-sky-200"
                >
                  <img src={`https://img.youtube.com/vi/${yt.videoId}/default.jpg`} alt="" className="w-10 h-6 object-cover rounded shrink-0" />
                  YouTube {i + 1}
                </button>
              ))}
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
                    setOriginal({ imageType: "ORIGINAL", imageSource: "UPLOAD", url: result.url, linkUrl: null, isThumbnail: false, sortOrder: 0 });
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setOriginalMode("url")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL 입력
              </button>
            </div>
          ) : (
            // URL 입력 폼
            <div className="space-y-1.5">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="이미지 URL (https://...)" className="h-8 text-sm" />
              <div className="flex gap-2">
                <Button
                  type="button" size="sm" variant="outline" className="h-8"
                  disabled={!urlInput.trim()}
                  onClick={() => {
                    setOriginal({ imageType: "ORIGINAL", imageSource: "URL", url: urlInput.trim(), linkUrl: null, isThumbnail: false, sortOrder: 0 });
                    setUrlInput("");
                    setOriginalMode("idle");
                  }}
                >
                  적용
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setOriginalMode("idle")}>취소</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─ 리크리샷 기준 이미지 ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">리크리샷 기준 이미지</span>
          <span className="text-xs text-muted-foreground">(4:5 · 사용자 리크리샷 참고용)</span>
        </div>

        <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
          {recreePhotoUrl ? (
            <div className="flex gap-4 items-start">
              <div className="relative group w-24 aspect-[4/5] rounded-lg overflow-hidden border shrink-0">
                <img src={recreePhotoUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute top-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
                  onClick={() => onRecreePhotoChange(null)}
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="absolute bottom-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 text-white"
                  onClick={() => setReCreeCropSrc(recreePhotoUrl)}
                  title="다시 자르기"
                >
                  <Crop className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                사용자가 이 포스트에서 리크리샷을 업로드할 때 기준 이미지로 표시됩니다.
                <br />
                다른 이미지로 변경하려면 아래 버튼을 사용하세요.
              </p>
            </div>
          ) : null}

          {/* 추가/변경 버튼 */}
          <div className="flex flex-wrap gap-2">
            {/* 소스 이미지에서 가져오기 */}
            {originalImage && (
              <button
                type="button"
                onClick={() => setReCreeCropSrc(originalImage.url)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors text-sky-700 border-sky-200"
              >
                <Crop className="h-3.5 w-3.5" />
                소스 이미지에서 자르기
              </button>
            )}
            {/* 배너에서 가져오기 */}
            {bannerImages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {bannerImages.slice(0, 3).map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setReCreeCropSrc(img.url)}
                    className="group relative w-12 aspect-[3/2] rounded overflow-hidden border hover:border-zinc-400 transition-colors shrink-0"
                    title={`배너 ${i + 1}에서 자르기`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Crop className="h-3 w-3 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
                {bannerImages.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{bannerImages.length - 3}</span>
                )}
              </div>
            )}
            {/* 새 파일 업로드 */}
            <label className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border cursor-pointer transition-colors",
              recreeUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted",
            )}>
              {recreeUploading
                ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent border-zinc-400 animate-spin" />업로드 중...</>
                : <><Upload className="h-3.5 w-3.5" />새 파일 업로드</>
              }
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={recreeUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  // blob URL은 크롭 완료/취소 시 revoke됨
                  setReCreeCropSrc(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 크롭 다이얼로그 */}
      {reCreeCropSrc && (
        <ReCreeshotCropDialog
          open
          imageSrc={reCreeCropSrc}
          onClose={() => {
            if (reCreeCropSrc.startsWith("blob:")) URL.revokeObjectURL(reCreeCropSrc);
            setReCreeCropSrc(null);
          }}
          onConfirm={async (blob) => {
            if (reCreeCropSrc.startsWith("blob:")) URL.revokeObjectURL(reCreeCropSrc);
            setReCreeCropSrc(null);
            setRecreeUploading(true);
            try {
              const supabase = createClient();
              const path = `recree/${postId ?? "new"}/${Date.now()}.jpg`;
              const { error } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
              if (error) { toast.error("업로드 실패: " + error.message); return; }
              const { data } = supabase.storage.from("post-images").getPublicUrl(path);
              onRecreePhotoChange(data.publicUrl);
            } finally {
              setRecreeUploading(false);
            }
          }}
        />
      )}

      {/* ─ 현재 썸네일 ─────────────────────────────────────────────────────── */}
      {thumbImage && (
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">현재 썸네일</p>
            {thumbSource && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{thumbSource}</span>
            )}
          </div>
          <div className="relative w-40 aspect-[3/2] rounded-lg overflow-hidden border">
            <img
              src={thumbImage.url}
              alt="썸네일"
              className="w-full h-full object-cover"
              style={{ objectPosition: `${(thumbImage.focalX ?? 0.5) * 100}% ${(thumbImage.focalY ?? 0.5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─ 초점 설정 다이얼로그 ────────────────────────────────────────────── */}
      {focalDialog && (
        <ImageFocalPointDialog
          open
          imageUrl={focalDialog.url}
          focalX={focalDialog.focalX}
          focalY={focalDialog.focalY}
          onConfirm={(x, y) => {
            updateFocal(focalDialog.url, x, y);
            setFocalDialog(null);
          }}
          onClose={() => setFocalDialog(null)}
        />
      )}
    </div>
  );
}
