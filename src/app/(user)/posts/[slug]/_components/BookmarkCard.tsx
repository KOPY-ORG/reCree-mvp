"use client";

import { useState, useEffect } from "react";
import { Play, Camera, Music, ExternalLink } from "lucide-react";
import type { SourcePlatform } from "@/types";

interface Props {
  url: string;
  platform?: SourcePlatform;
  sourceDetail?: string | null;
}

interface OgData {
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
}

// og:title · og:description 은 플랫폼이 감싼 따옴표와 글 속 따옴표가 겹쳐 ""HOMETOWN"" 처럼 온다.
// 화면에서만 연달아 붙은 따옴표를 하나로 줄인다 (원본 응답은 그대로)
function tidyQuotes(text: string): string {
  return text.replace(/["“”＂]{2,}/g, '"');
}

function PlatformFallback({ platform }: { platform?: SourcePlatform }) {
  const p = platform?.toUpperCase();

  const base = "w-20 shrink-0 self-stretch flex items-center justify-center";
  if (p === "YOUTUBE") {
    return <div className={`${base} bg-red-600`}><Play className="h-6 w-6 text-white fill-white" /></div>;
  }
  if (p === "INSTAGRAM") {
    return <div className={`${base} bg-gradient-to-br from-purple-600 to-pink-500`}><Camera className="h-6 w-6 text-white" /></div>;
  }
  if (p === "X" || p === "TWITTER") {
    return <div className={`${base} bg-black`}><span className="text-white font-bold text-lg">X</span></div>;
  }
  if (p === "TIKTOK") {
    return <div className={`${base} bg-black`}><Music className="h-6 w-6 text-white" /></div>;
  }
  return (
    <div className={`${base} bg-gray-100`}>
      <ExternalLink className="h-5 w-5 text-gray-500" />
    </div>
  );
}

export function BookmarkCard({ url, platform, sourceDetail }: Props) {
  const [og, setOg] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetch(`/api/og-image?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => setOg(data))
      .catch(() => setOg({ thumbnailUrl: null, title: null, description: null }))
      .finally(() => setLoading(false));
  }, [url]);

  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {}

  if (loading) {
    return <div className="h-20 rounded-[var(--radius-card)] animate-pulse bg-muted" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      // 왼쪽 썸네일 · 플랫폼 칸은 카드가 자르는 모서리(20px)를 그대로 따라간다 — 칸에 따로 모서리를 주지 않는다
      className="surface-card flex flex-row overflow-hidden min-h-20 transition-opacity active:opacity-70"
    >
      {/* 좌측 썸네일 */}
      {og?.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={og.thumbnailUrl}
          alt={og.title ?? ""}
          className="w-20 shrink-0 self-stretch object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <PlatformFallback platform={platform} />
      )}

      {/* 우측 텍스트 */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{hostname}</p>
        {og?.title && (
          <p
            className="text-[13px] font-medium text-foreground mt-0.5 leading-snug overflow-hidden"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
          >
            {tidyQuotes(og.title)}
          </p>
        )}
        {og?.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 truncate">{tidyQuotes(og.description)}</p>
        )}
        {sourceDetail && (
          <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug italic">{sourceDetail}</p>
        )}
      </div>
    </a>
  );
}
