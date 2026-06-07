"use client";

import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { getDDay, formatDateRangeUTC } from "@/lib/event-format";
import { EventImage } from "@/components/events/EventImage";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";

interface Props {
  event: EventCollectionMapMarker;
  placeCount: number;
  collectionName: string;
  collectionSlug: string;
  /** 티켓 노치 반원 배경색 — 카드가 놓일 컨테이너 배경과 일치시킬 것 */
  notchBg?: string;
}

const RED = "#F01941";

export function EventVerticalCard({
  event,
  placeCount,
  collectionName,
  collectionSlug,
  notchBg = "#fff",
}: Props) {
  const dday = getDDay(event.startDate, event.endDate);
  const dateRange = formatDateRangeUTC(event.startDate, event.endDate);

  return (
    <div
      className="relative flex flex-col rounded-[14px] overflow-hidden bg-white"
      style={{
        border: `1.5px solid color-mix(in srgb, ${RED} 20%, #EEEFF2)`,
        boxShadow: `0 4px 16px color-mix(in srgb, ${RED} 9%, rgba(20,18,28,.05))`,
      }}
    >
      {/* ── 이미지 패널 ── */}
      <div className="relative w-full">
        <EventImage
          src={event.bannerImageUrl}
          alt={event.nameEn}
          ratio="4/3"
          sizes="(max-width: 768px) 72vw, 220px"
          autoFit
        />

        {/* 그라디언트 쉐이드 오버레이 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(160deg, rgba(10,6,9,.5) 0%, transparent 42%, transparent 58%, rgba(10,6,9,.46) 100%)",
          }}
        />

        {/* EVENT 칩 (좌상단) */}
        <div
          className="absolute top-1.5 left-1.5 z-[3] px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold shadow-md"
          style={{ background: RED }}
        >
          EVENT
        </div>

        {/* D-day 칩 (우상단) */}
        {dday && (
          <div className="absolute top-1.5 right-1.5 z-[3] px-1.5 py-0.5 rounded-full bg-[rgba(0,0,0,0.55)] text-white text-[10px] font-bold tabular-nums shadow-md">
            {dday}
          </div>
        )}
      </div>

      {/* ── 티켓 천공선 (가로 점선 + 좌우 반원 노치) ── */}
      <div
        className="relative h-px w-full shrink-0"
        style={{
          borderTop: `2px dashed color-mix(in srgb, ${RED} 30%, #E6E4E8)`,
        }}
      >
        <div
          className="absolute -top-[7px] -left-[7px] w-[14px] h-[14px] rounded-full"
          style={{ background: notchBg }}
        />
        <div
          className="absolute -top-[7px] -right-[7px] w-[14px] h-[14px] rounded-full"
          style={{ background: notchBg }}
        />
      </div>

      {/* ── 본문 ── */}
      <Link
        href={`/events/${collectionSlug}/${event.eventSlug}`}
        className="flex flex-col gap-0.5 px-2 pt-2 pb-2.5"
      >
        {/* 컬렉션명 */}
        <p
          className="text-[9px] font-semibold uppercase tracking-[.06em] truncate"
          style={{ color: RED }}
        >
          {collectionName}
        </p>

        {/* 이벤트명 — 1줄이어도 2줄 높이 고정 */}
        <h3
          className="text-xs font-semibold line-clamp-2 min-h-[2rem]"
          style={{ color: "#16181C" }}
        >
          {event.nameEn}
        </h3>

        {/* 날짜 행 */}
        <div className="flex items-center gap-1 min-w-0">
          <Calendar className="w-3 h-3 shrink-0" style={{ color: RED }} />
          <span
            className="text-xs font-bold tabular-nums whitespace-nowrap"
            style={{ color: RED }}
          >
            {dateRange}
          </span>
        </div>

        {/* 장소 행 */}
        <div className="flex items-center gap-0.5 min-w-0">
          <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
          <span className="text-[9px] text-muted-foreground truncate">
            {placeCount >= 2 ? `${placeCount} locations` : event.place.nameEn}
          </span>
        </div>
      </Link>
    </div>
  );
}
