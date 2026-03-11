"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Camera, Link2 } from "lucide-react";

interface OriginalImage {
  id: string;
  url: string;
  linkUrl?: string | null;
}

interface Props {
  images: OriginalImage[];
  originalLinkUrls?: string[];  // fallback (isOriginalLink 순서대로, 슬롯별 매핑)
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

function SourceCard({ image, onClick }: { image: OriginalImage; onClick?: () => void }) {
  const [error, setError] = useState(false);
  const shortDomain = getShortDomain(image.url);

  return (
    <div
      className="relative w-18 aspect-[3/2] rounded-lg shadow-md overflow-hidden shrink-0 cursor-pointer ring-1 ring-white/60"
      onClick={onClick}
    >
      {error ? (
        <DomainFallback url={image.url} />
      ) : (
        <Image
          src={image.url}
          alt={shortDomain}
          fill
          unoptimized
          className="object-cover"
          sizes="48px"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export function OriginalSourceCards({ images, originalLinkUrls }: Props) {
  if (images.length === 0) return null;

  const displayed = images;

  return (
    <div className="absolute bottom-3 left-3 flex gap-2 z-10">
      {displayed.map((img, i) => {
        const clickUrl = img.linkUrl ?? originalLinkUrls?.[i] ?? null;
        const handleClick = clickUrl
          ? () => window.open(clickUrl, "_blank")
          : undefined;
        return <SourceCard key={img.id} image={img} onClick={handleClick} />;
      })}
    </div>
  );
}
