"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { EventListCard } from "@/components/maps/EventListCard";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";

interface Props {
  events: EventCollectionMapMarker[];
  collectionSlug: string;
  collectionName: string;
  savedEventIds?: string[];
  onClose?: () => void;
}

export function EventPeekCarousel({ events, collectionSlug, collectionName, savedEventIds = [], onClose }: Props) {
  const savedEventIdsSet = new Set(savedEventIds);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 카드 폭(90%) + gap(12px)을 한 스텝으로 계산
    const stepWidth = el.offsetWidth * 0.90 + 12;
    const idx = Math.round(el.scrollLeft / stepWidth);
    setActiveIndex(Math.max(0, Math.min(idx, events.length - 1)));
  };

  if (events.length === 0) return null;

  const isMulti = events.length > 1;

  return (
    <div className="absolute inset-x-0 bottom-4 z-50">
      {/* 닫기 버튼 */}
      <div className="flex justify-end px-4 mb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center active:opacity-60 transition-opacity"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* 카드 캐러셀
          · 1장: 풀 width (px-4 좌우 여백, 카드가 컨테이너 꽉 채움)
          · 2장+: edge-peek (px-[6%], 카드 88%, scroll-snap + dots) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex overflow-x-auto pb-1 scrollbar-hide ${isMulti ? "gap-3 px-[6%]" : "px-4"}`}
        style={isMulti ? { scrollSnapType: "x mandatory" } : undefined}
      >
        {events.map((event) => (
          <div
            key={event.eventPlaceId}
            className="flex-shrink-0"
            style={isMulti ? { width: "90%", scrollSnapAlign: "center" } : { width: "100%" }}
          >
            <EventListCard
              event={event}
              collectionName={collectionName}
              collectionSlug={collectionSlug}
              placeCount={1}
              isSelected={false}
              isSaved={savedEventIdsSet.has(event.eventId)}
              notchBg="#fff"
            />
          </div>
        ))}
      </div>

      {/* 페이지 dots — 2장 이상일 때만 */}
      {events.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2">
          {events.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                background: i === activeIndex ? "#E9283D" : "rgba(0,0,0,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
