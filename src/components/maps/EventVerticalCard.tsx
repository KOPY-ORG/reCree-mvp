"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { getDDay, formatDateRangeUTC } from "@/lib/event-format";
import type { EventCollectionMapEvent } from "@/lib/event-collection-queries";

interface Props {
  event: EventCollectionMapEvent;
  collectionName: string;
  collectionSlug: string;
  /** 티켓 노치 반원 배경색 — 카드가 놓일 컨테이너 배경과 일치시킬 것 */
  notchBg?: string;
}

const RED = "#F01941";

export function EventVerticalCard({
  event,
  collectionName,
  collectionSlug,
  notchBg = "#fff",
}: Props) {
  const dday = getDDay(event.startDate, event.endDate);
  const dateRange = formatDateRangeUTC(event.startDate, event.endDate);

  return (
    <div
      className="relative flex flex-col rounded-[18px] overflow-hidden bg-white"
      style={{
        border: `1.5px solid color-mix(in srgb, ${RED} 20%, #EEEFF2)`,
        boxShadow: `0 4px 16px color-mix(in srgb, ${RED} 9%, rgba(20,18,28,.05))`,
      }}
    >
      {/* ── 이미지 패널 ── */}
      <div className="relative w-full aspect-[4/3] bg-[#1C0A13] overflow-hidden">
        {event.bannerImageUrl ? (
          <Image
            src={event.bannerImageUrl}
            alt={event.nameEn}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 72vw, 220px"
            unoptimized={isExternalImage(event.bannerImageUrl)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3A0014] to-[#1C0A13]" />
        )}

        {/* 그라디언트 쉐이드 오버레이 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(160deg, rgba(10,6,9,.5) 0%, transparent 42%, transparent 58%, rgba(10,6,9,.46) 100%)",
          }}
        />

        {/* EVENT 칩 (좌상단) — 빨강 solid */}
        <div
          className="absolute top-2 left-2 z-[3] px-2 py-0.5 rounded-full text-white text-xs font-bold shadow-md"
          style={{ background: RED }}
        >
          EVENT
        </div>

        {/* D-day 칩 (우상단) — 검정 반투명 */}
        {dday && (
          <div className="absolute top-2 right-2 z-[3] px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.55)] text-white text-xs font-bold tabular-nums shadow-md">
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
          className="absolute -top-[9px] -left-[9px] w-[18px] h-[18px] rounded-full"
          style={{ background: notchBg }}
        />
        <div
          className="absolute -top-[9px] -right-[9px] w-[18px] h-[18px] rounded-full"
          style={{ background: notchBg }}
        />
      </div>

      {/* ── 본문 ── */}
      <Link
        href={`/events/${collectionSlug}/${event.slug}`}
        className="flex flex-col gap-1 px-3 pt-3 pb-3.5"
      >
        {/* 컬렉션명 */}
        <p
          className="text-xs font-semibold uppercase tracking-[.06em] truncate"
          style={{ color: RED }}
        >
          {collectionName}
        </p>

        {/* 이벤트명 — 1줄이어도 2줄 높이 고정 */}
        <h3
          className="text-base font-semibold line-clamp-2 min-h-[3rem]"
          style={{ color: "#16181C" }}
        >
          {event.nameEn}
        </h3>

        {/* 날짜 행 */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-4 h-4 shrink-0" style={{ color: RED }} />
          <span
            className="text-base font-bold tabular-nums whitespace-nowrap"
            style={{ color: RED }}
          >
            {dateRange}
          </span>
        </div>

        {/* 장소 행 */}
        <div className="flex items-center gap-0.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {event.place.nameEn}
          </span>
        </div>
      </Link>
    </div>
  );
}
