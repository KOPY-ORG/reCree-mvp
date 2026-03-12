"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
  const total = images.length;

  // 1장이면 단순 표시
  const single = total === 1;

  // 트랙: [last, ...images, first] — 인덱스 1~total이 실제 이미지
  const track = single ? images : [images[total - 1], ...images, images[0]];

  // 현재 트랙 인덱스 (초기: 1 = 첫 번째 실제 이미지)
  const [pos, setPos] = useState(single ? 0 : 1);
  const [animated, setAnimated] = useState(true);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // 실제 dot 인덱스 (0-based)
  const dotIndex = single ? 0 : pos === 0 ? total - 1 : pos === total + 1 ? 0 : pos - 1;

  function goTo(nextPos: number, withAnim = true) {
    setAnimated(withAnim);
    setPos(nextPos);
  }

  function next() { goTo(pos + 1); }
  function prev() { goTo(pos - 1); }

  // 트랜지션 끝 후 클론에서 실제 위치로 순간 이동
  function onTransitionEnd() {
    if (!single) {
      if (pos === 0) goTo(total, false);
      else if (pos === total + 1) goTo(1, false);
    }
  }

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

  const trackTotal = track.length;

  return (
    <div
      className="group relative w-full aspect-[3/2] bg-muted overflow-hidden select-none touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 슬라이드 트랙 */}
      <div
        className={animated ? "flex h-full transition-transform duration-300 ease-in-out" : "flex h-full"}
        style={{
          width: `${trackTotal * 100}%`,
          transform: `translateX(-${pos * (100 / trackTotal)}%)`,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {track.map((img, i) => (
          <div key={`${img.id}-${i}`} className="relative h-full" style={{ width: `${100 / trackTotal}%` }}>
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
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 672px) 672px, 100vw"
                  priority={i === 1}
                  unoptimized
                  onLoad={() => setLoadedMap((m) => ({ ...m, [img.id]: true }))}
                  onError={() => setErrorMap((m) => ({ ...m, [img.id]: true }))}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* 상단 그라디언트 */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10" />

      {/* 화살표 버튼 (데스크톱, 2장 이상) */}
      {total >= 2 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="다음 이미지"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* children overlay */}
      {children}

      {/* dot indicator */}
      {total >= 2 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i + 1)}
              className={`rounded-full transition-all duration-200 ${
                i === dotIndex ? "w-3 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* 카운터 */}
      {total >= 2 && (
        <div className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-medium">
          {dotIndex + 1} / {total}
        </div>
      )}
    </div>
  );
}
