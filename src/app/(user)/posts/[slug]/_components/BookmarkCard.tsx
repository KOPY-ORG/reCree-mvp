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

// 설명이 없을 때의 한 줄 — 어디로 가는 링크인지 말한다
const PLATFORM_ACTION: Partial<Record<string, string>> = {
  INSTAGRAM: "View on Instagram",
  X: "View on X",
  TWITTER: "View on X",
  TIKTOK: "View on TikTok",
  PINTEREST: "View on Pinterest",
  WEVERSE: "View on Weverse",
};

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
  // 사이트가 제목 · 설명을 주지 않거나(허용 목록 밖 · 메타 없음 · 가져오기 실패) 비어 있어도 빈 카드가 되지 않게,
  // 제목은 도메인, 설명은 "어디서 보는지" 한 줄로 채운다. lg 는 도메인 줄을 숨기므로 이것이 없으면 아이콘만 남는다
  const title = og?.title?.trim() ? tidyQuotes(og.title) : null;
  const description = og?.description?.trim()
    ? tidyQuotes(og.description)
    : PLATFORM_ACTION[platform?.toUpperCase() ?? ""] ?? "Visit website";

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
          alt={title ?? hostname}
          className={`w-20 shrink-0 self-stretch object-cover ${SOURCE_CARD_LG_THUMB}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <PlatformFallback platform={platform} />
      )}

      {/* 우측 텍스트 */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        {/* 위 작은 도메인 줄(모바일) — 제목이 도메인으로 대신 채워지면 같은 말이 두 번이라 뺀다 */}
        {title && (
          <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate lg:hidden">{hostname}</p>
        )}
        <p
          className={`text-[13px] font-medium text-foreground leading-snug overflow-hidden lg:mt-0 lg:text-sm lg:font-semibold lg:[-webkit-line-clamp:1]! ${title ? "mt-0.5" : ""}`}
          style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
        >
          {title ?? hostname}
        </p>
        <p className="text-[12px] text-gray-500 mt-0.5 truncate lg:text-[13px]">{description}</p>
        {sourceDetail && (
          <p className={SOURCE_DETAIL}>{sourceDetail}</p>
        )}
      </div>
      <ExternalLink className="mr-4 hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden="true" />
    </a>
  );
}
