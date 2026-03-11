"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

interface BannerImage {
  id: string;
  url: string;
  sortOrder: number;
}

interface Props {
  images: BannerImage[];
  children?: React.ReactNode;
}

export function BannerCarousel({ images, children }: Props) {
  const [current, setCurrent] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  const total = images.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) next();
    else if (delta > 50) prev();
    touchStartX.current = null;
  };

  if (total === 0) return null;

  const img = images[current];

  return (
    <div
      className="relative w-full aspect-[3/2] bg-muted overflow-hidden select-none touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 상단 그라디언트 — 헤더 아이콘 가시성 */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10" />

      {/* 이미지 */}
      {errorMap[img.id] ? (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <>
          {!loadedMap[img.id] && (
            <div className="absolute inset-0 animate-pulse bg-gray-200" />
          )}
          <Image
            key={img.id}
            src={img.url}
            alt=""
            fill
            className="object-cover"
            sizes="430px"
            priority={current === 0}
            unoptimized
            onLoad={() => setLoadedMap((m) => ({ ...m, [img.id]: true }))}
            onError={() => setErrorMap((m) => ({ ...m, [img.id]: true }))}
          />
        </>
      )}

      {/* children overlay */}
      {children}

      {/* dot indicator (2장 이상) */}
      {total >= 2 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? "w-3 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* 카운터 */}
      {total >= 2 && (
        <div className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-medium">
          {current + 1} / {total}
        </div>
      )}
    </div>
  );
}
