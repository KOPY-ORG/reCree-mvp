"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { Play, Camera, Link2 } from "lucide-react";
import { parseYouTubeSource, youTubeThumbnail } from "./youtube-source";

interface OriginalImage {
  id: string;
  url: string;
  linkUrl?: string | null;
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
}

interface Props {
  images: OriginalImage[];
  originalLinkUrls?: string[];
  className?: string;
}

function getShortDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

function getHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function DomainFallback({ url }: { url: string }) {
  const hostname = getHostname(url);

  if (hostname.includes("youtube") || hostname.includes("youtu.be")) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-600">
        <Play className="h-4 w-4 fill-white text-white" />
      </div>
    );
  }
  if (hostname.includes("instagram")) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" }}
      >
        <Camera className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (hostname.includes("x.com") || hostname.includes("twitter")) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <span className="text-white text-xs font-bold">X</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-300">
      <Link2 className="h-4 w-4 text-gray-600" />
    </div>
  );
}

// next/image 최적화를 거치지 않는다 (Vercel 이미지 한도).
// maxresdefault 가 없으면 i.ytimg 는 404 와 함께 120px 회색 이미지를 주므로, 오류와 120px 둘 다 hqdefault 로 넘긴다
function YouTubeThumbnail({ videoId, alt }: { videoId: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const hq = youTubeThumbnail(videoId, "hqdefault");
  const fallbackIfMissing = (img: HTMLImageElement) => {
    if (img.src !== hq && img.complete && img.naturalWidth <= 120) img.src = hq;
  };

  // 하이드레이션 전에 로드가 끝나면 onLoad · onError 를 놓치므로 마운트 시점에도 확인한다
  useEffect(() => {
    if (imgRef.current) fallbackIfMissing(imgRef.current);
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={youTubeThumbnail(videoId, "maxresdefault")}
      alt={alt}
      className="absolute inset-0 size-full object-cover"
      onLoad={(e) => fallbackIfMissing(e.currentTarget)}
      onError={(e) => fallbackIfMissing(e.currentTarget)}
    />
  );
}

function SourceCard({ image, youTubeVideoId, onClick }: { image: OriginalImage; youTubeVideoId?: string | null; onClick?: () => void }) {
  const [error, setError] = useState(false);
  const shortDomain = getShortDomain(image.url);

  return (
    <div
      className="relative w-18 sm:w-24 md:w-32 lg:w-40 aspect-[4/3] rounded-lg shadow-md overflow-hidden shrink-0 cursor-pointer ring-1 ring-white/60"
      onClick={onClick}
    >
      {youTubeVideoId ? (
        <YouTubeThumbnail videoId={youTubeVideoId} alt="youtube" />
      ) : error ? (
        <DomainFallback url={image.url} />
      ) : (
        <Image
          src={image.url}
          alt={shortDomain}
          fill
          unoptimized={isExternalImage(image.url)}
          className="object-cover"
          style={focalStyle(image.focalX, image.focalY, image.zoom)}
          sizes="(min-width: 1024px) 160px, (min-width: 768px) 128px, (min-width: 640px) 96px, 72px"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export function OriginalSourceCards({ images, originalLinkUrls, className }: Props) {
  if (images.length === 0) return null;

  return (
    <div className={className ?? "absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex gap-2 sm:gap-3 z-10"}>
      {images.map((img, i) => {
        const clickUrl = img.linkUrl ?? originalLinkUrls?.[i] ?? null;
        // 카드가 유튜브를 열면 저장된 장면 이미지 대신 그 영상의 공식 썸네일을 보여준다 (DB 값은 그대로)
        const youTubeVideoId = clickUrl ? parseYouTubeSource(clickUrl)?.videoId : null;
        const handleClick = clickUrl
          ? () => window.open(clickUrl, "_blank")
          : undefined;
        return <SourceCard key={img.id} image={img} youTubeVideoId={youTubeVideoId} onClick={handleClick} />;
      })}
    </div>
  );
}
