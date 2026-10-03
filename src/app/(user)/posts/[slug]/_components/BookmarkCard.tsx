"use client";

import { useState, useEffect } from "react";
import { Play, Camera, Music, ExternalLink } from "lucide-react";
import type { SourcePlatform } from "@/types";
import { SOURCE_CARD, SOURCE_CARD_BADGE, SOURCE_CARD_LG_THUMB, SOURCE_DETAIL } from "./source-card-styles";
import { hostnameOf } from "@/lib/url";

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

  const base = SOURCE_CARD_BADGE;
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

  const hostname = hostnameOf(url, "");

  if (loading) {
    return <div className="h-20 rounded-card animate-pulse bg-muted lg:h-[72px]" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={SOURCE_CARD}
    >
      {/* 좌측 썸네일 */}
      {og?.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={og.thumbnailUrl}
          alt={og.title ?? ""}
          className={`w-20 shrink-0 self-stretch object-cover ${SOURCE_CARD_LG_THUMB}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <PlatformFallback platform={platform} />
      )}

      {/* 우측 텍스트 */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate lg:hidden">{hostname}</p>
        {og?.title && (
          <p
            className="text-[13px] font-medium text-foreground mt-0.5 leading-snug overflow-hidden lg:mt-0 lg:text-sm lg:font-semibold lg:[-webkit-line-clamp:1]!"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
          >
            {tidyQuotes(og.title)}
          </p>
        )}
        {og?.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 truncate lg:text-[13px]">{tidyQuotes(og.description)}</p>
        )}
        {sourceDetail && (
          <p className={SOURCE_DETAIL}>{sourceDetail}</p>
        )}
      </div>
      <ExternalLink className="mr-4 hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden="true" />
    </a>
  );
}
