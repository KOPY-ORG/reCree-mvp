"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { labelBackground } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

export type BannerItem = {
  slug: string;
  titleEn: string;
  displayName: string;
  thumbnailUrl: string | null;
  focalX?: number | null;
  focalY?: number | null;
  labels: {
    text: string;
    colorHex: string;
    colorHex2: string | null;
    gradientDir: string;
    gradientStop: number;
    textColorHex: string;
  }[];
};

export function HomeBannerCarousel({ banners }: { banners: BannerItem[] }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  return (
    <div
      className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-4"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx < -40) next();
        else if (dx > 40) prev();
        touchStartX.current = null;
      }}
    >
      <Link href={`/posts/${banner.slug}`} className="absolute inset-0">
        {banner.thumbnailUrl ? (
          <Image
            src={banner.thumbnailUrl}
            alt={banner.titleEn}
            fill
            unoptimized
            className="object-cover"
            style={{ objectPosition: `${(banner.focalX ?? 0.5) * 100}% ${(banner.focalY ?? 0.5) * 100}%` }}
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-4 right-4">
          {banner.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {banner.labels.map((label, i) => (
                <LabelBadge
                  key={i}
                  text={label.text}
                  background={labelBackground(label)}
                  color={label.textColorHex}
                />
              ))}
            </div>
          )}
          <h2 className="text-white font-bold text-lg leading-tight">
            {banner.displayName}
          </h2>
        </div>
      </Link>

      {/* 인디케이터 — 하단 중앙 */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all pointer-events-auto ${
                i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
