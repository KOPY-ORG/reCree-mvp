"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isExternalImage } from "@/lib/image";
import type { MapPost } from "@/lib/map-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { PostCarouselCard } from "./PostCarouselCard";

interface Props {
  posts: MapPost[];
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  placeImages?: { url: string }[];
}

export function PostCardCarousel({ posts, savedPostIds, tagGroupMap, placeImages = [] }: Props) {
  const totalItems = posts.length + placeImages.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || totalItems < 2) return;

    cardRefs.current = cardRefs.current.slice(0, totalItems);

    const ob = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = cardRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) setActiveIndex(index);
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    cardRefs.current.forEach((el) => {
      if (el) ob.observe(el);
    });

    return () => ob.disconnect();
  }, [posts, placeImages, totalItems]);

  return (
    <div className="pb-3">
      <div
        ref={scrollRef}
        className={`flex gap-2 px-5 [scroll-padding-left:20px] overflow-x-auto snap-x snap-mandatory scrollbar-hide${totalItems === 1 ? " justify-center" : ""}`}
      >
        {/* 포스트 카드 */}
        {posts.map((post, i) => (
          <div
            key={post.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="snap-start shrink-0 w-[85%]"
          >
            <PostCarouselCard
              post={post}
              isSaved={savedPostIds.has(post.id)}
              tagGroupMap={tagGroupMap}
            />
          </div>
        ))}

        {/* 장소 이미지 카드 — 포스트 카드 전체 높이(썸네일+제목)에 맞춤 */}
        {placeImages.map((img, i) => (
          <div
            key={`place-img-${i}`}
            ref={(el) => { cardRefs.current[posts.length + i] = el; }}
            className="snap-start shrink-0 w-[85%]"
          >
            <div
              className="relative w-full rounded-xl overflow-hidden bg-muted"
            >
              <div style={{ aspectRatio: "2/1" }} />
              <div className="h-[52px]" />
              <Image
                src={img.url}
                alt=""
                fill
                unoptimized={isExternalImage(img.url)}
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        ))}
      </div>

      {totalItems >= 2 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {Array.from({ length: totalItems }).map((_, i) => (
            <div
              key={i}
              className={
                i === activeIndex
                  ? "w-4 h-1 rounded-full bg-foreground transition-[width]"
                  : "w-1 h-1 rounded-full bg-muted-foreground/30 transition-[width]"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
