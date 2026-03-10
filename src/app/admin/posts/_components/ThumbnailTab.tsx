"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, Youtube, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PostSourceInput } from "../_actions/post-actions";

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([^?&"'\s]{11})/,
  );
  return match?.[1] ?? null;
}

function detectThumbnailMode(url: string): "youtube" | "upload" | "url" | null {
  if (!url) return null;
  if (url.includes("img.youtube.com") || url.includes("ytimg.com")) return "youtube";
  if (url.includes("supabase.co") || url.includes("supabase.in")) return "upload";
  return "url";
}

interface Props {
  sources: PostSourceInput[];
  thumbnailUrl: string;
  setThumbnailUrl: (v: string) => void;
  thumbnailUploading: boolean;
  handleThumbnailUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThumbnailTab({
  sources,
  thumbnailUrl, setThumbnailUrl,
  thumbnailUploading, handleThumbnailUpload,
}: Props) {
  const [thumbnailMode, setThumbnailMode] = useState<"youtube" | "upload" | "url" | null>(
    () => detectThumbnailMode(thumbnailUrl),
  );
  const [urlInput, setUrlInput] = useState(
    detectThumbnailMode(thumbnailUrl) === "url" ? thumbnailUrl : "",
  );

  const ytSource = sources.find((s) => s.sourceType === "YOUTUBE" && s.sourceUrl);
  const ytVideoId = ytSource ? extractYouTubeVideoId(ytSource.sourceUrl) : null;
  const ytThumbUrl = ytVideoId
    ? `https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`
    : null;

  const handleSelectMode = (mode: "youtube" | "upload" | "url") => {
    setThumbnailMode(mode);
    if (mode === "youtube" && ytThumbUrl) {
      setThumbnailUrl(ytThumbUrl);
    } else if (mode === "url") {
      setThumbnailUrl(urlInput);
    }
  };

  return (
    <div className="space-y-4">
      {thumbnailUrl && (
        <div className="flex items-start gap-3">
          <div className="relative w-60 aspect-[3/2] rounded-lg overflow-hidden border shrink-0">
            <img src={thumbnailUrl} alt="썸네일" className="h-full w-full object-cover" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setThumbnailUrl("");
              setThumbnailMode(null);
              setUrlInput("");
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            제거
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleSelectMode("youtube")}
          disabled={!ytThumbUrl}
          className={cn(
            "aspect-[3/2] flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 text-center transition-colors",
            thumbnailMode === "youtube"
              ? "border-foreground bg-muted"
              : "border-dashed hover:border-foreground/50",
            !ytThumbUrl && "opacity-40 cursor-not-allowed",
          )}
        >
          <Youtube className="h-5 w-5 text-red-500" />
          <span className="text-xs font-medium">YouTube 썸네일</span>
          <span className="text-[10px] text-muted-foreground">
            {ytThumbUrl ? "자동 감지됨" : "YouTube 출처 없음"}
          </span>
        </button>

        <label
          className={cn(
            "aspect-[3/2] flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 text-center transition-colors cursor-pointer",
            thumbnailMode === "upload"
              ? "border-foreground bg-muted"
              : "border-dashed hover:border-foreground/50",
          )}
          onClick={() => setThumbnailMode("upload")}
        >
          {thumbnailUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">직접 업로드</span>
          <span className="text-[10px] text-muted-foreground">이미지 선택</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={thumbnailUploading}
            onChange={(e) => {
              setThumbnailMode("upload");
              handleThumbnailUpload(e);
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => handleSelectMode("url")}
          className={cn(
            "aspect-[3/2] flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 text-center transition-colors",
            thumbnailMode === "url"
              ? "border-foreground bg-muted"
              : "border-dashed hover:border-foreground/50",
          )}
        >
          <LinkIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">URL 입력</span>
          <span className="text-[10px] text-muted-foreground">외부 이미지</span>
        </button>
      </div>

      {thumbnailMode === "url" && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setThumbnailUrl(e.target.value);
            }}
            placeholder="https://..."
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}
