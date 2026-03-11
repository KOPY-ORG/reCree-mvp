"use client";

import { useState, useEffect } from "react";
import { Play, Camera, Music, ExternalLink } from "lucide-react";

interface Props {
  url: string;
  platform?: string;
}

interface OgData {
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
}

function PlatformFallback({ platform }: { platform?: string }) {
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

export function BookmarkCard({ url, platform }: Props) {
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
    return <div className="h-20 rounded-xl animate-pulse bg-gray-100" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-row rounded-xl border border-gray-200 overflow-hidden min-h-20"
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
            {og.title}
          </p>
        )}
        {og?.description && (
          <p
            className="text-[12px] text-gray-500 mt-0.5 overflow-hidden"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1 }}
          >
            {og.description}
          </p>
        )}
      </div>
    </a>
  );
}
