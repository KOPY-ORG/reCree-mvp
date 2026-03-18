"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

interface Props {
  videoUrl: string;
  thumbnailUrl: string | null;
  titleEn: string;
  className?: string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export function GuideVideoCard({ videoUrl, thumbnailUrl, titleEn, className = "aspect-[4/5] rounded-xl" }: Props) {
  const [open, setOpen] = useState(false);

  const youtubeId = extractYouTubeId(videoUrl);
  const thumb = thumbnailUrl ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null);
  const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0` : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative w-full overflow-hidden bg-zinc-900 flex items-center justify-center ${className}`}
      >
        {thumb ? (
          <Image src={thumb} alt={titleEn} fill className="object-cover" sizes="(max-width: 672px) 50vw, 336px" unoptimized />
        ) : (
          <div className="w-full h-full bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-2 left-2 right-2 text-left">
          <p className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-0.5">Guide</p>
          <p className="text-xs font-bold text-white leading-tight line-clamp-2">{titleEn}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="size-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
            <p className="text-sm font-semibold text-white">{titleEn}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-white">
              <X className="size-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full aspect-[9/16] max-h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <p className="text-sm text-zinc-400">재생할 수 없는 URL입니다.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
