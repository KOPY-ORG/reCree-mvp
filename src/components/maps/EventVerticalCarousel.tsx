"use client";

import { useMemo } from "react";
import Link from "next/link";
import { EventVerticalCard } from "./EventVerticalCard";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";
import { dedupeEventMarkers } from "@/lib/event-utils";
import { sortEventMarkers } from "@/lib/event-format";

interface Props {
  title: string;
  titleClassName?: string;
  events: EventCollectionMapMarker[];
  collectionSlug: string;
  collectionName: string;
  notchBg?: string;
}

export function EventVerticalCarousel({
  title,
  titleClassName = "font-bold text-lg",
  events,
  collectionSlug,
  collectionName,
  notchBg,
}: Props) {
  const deduped = useMemo(() => sortEventMarkers(dedupeEventMarkers(events)), [events]);

  if (deduped.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between px-4 mb-3">
        <span className={titleClassName}>{title}</span>
        <Link
          href={`/discover?collection=${collectionSlug}`}
          className="text-sm text-muted-foreground"
        >
          See all ›
        </Link>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-4"
        style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: "1rem" }}
      >
        {deduped.map(({ marker, placeIds }) => (
          <div
            key={marker.eventId}
            className="flex-shrink-0 w-[42%]"
            style={{ scrollSnapAlign: "start" }}
          >
            <EventVerticalCard
              event={marker}
              placeCount={placeIds.length}
              collectionName={collectionName}
              collectionSlug={collectionSlug}
              notchBg={notchBg}
            />
          </div>
        ))}
        {/* WebKit은 overflow-scroll 컨테이너의 padding-right를 무시 — 스페이서로 우측 여백 확보 */}
        <div className="shrink-0 w-4" />
      </div>
    </section>
  );
}
