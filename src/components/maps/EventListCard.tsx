"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Bookmark, ChevronRight } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { getDDay, formatDateRangeUTC, EVENT_RED as RED } from "@/lib/event-format";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

interface Props {
  event: EventCollectionMapMarker;
  collectionName: string;
  collectionSlug: string;
  placeCount: number;
  isSelected?: boolean;
  isSaved?: boolean;
  onSelect?: () => void;
  onToggleSave?: (saved: boolean) => void;
  onViewMap?: () => void;
  /** 티켓 천공선 노치(반원)가 배경에 녹아들 때 쓸 배경색 */
  notchBg?: string;
}


export function EventListCard({
  event,
  collectionName,
  collectionSlug,
  placeCount,
  isSelected = false,
  isSaved = false,
  onSelect,
  onToggleSave,
  onViewMap,
  notchBg = "#fff",
}: Props) {
  const dday = getDDay(event.startDate, event.endDate);
  const dateRange = formatDateRangeUTC(event.startDate, event.endDate);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
      className="relative flex rounded-[18px] overflow-hidden bg-white cursor-pointer active:scale-[.992] transition-transform duration-[120ms]"
      style={
        isSelected
          ? {
              border: `2px solid ${RED}`,
              background: "#fff",
              boxShadow: "0 10px 26px color-mix(in srgb, #E9283D 26%, transparent)",
            }
          : {
              border: `1.5px solid color-mix(in srgb, #E9283D 20%, #EEEFF2)`,
              boxShadow: "0 4px 16px color-mix(in srgb, #E9283D 9%, rgba(20,18,28,.05))",
            }
      }
    >
      {/* ── 이미지 패널 ── */}
      <div className="relative w-[110px] shrink-0 self-stretch bg-[#1C0A13] overflow-hidden">
        {event.bannerImageUrl ? (
          <Image
            src={event.bannerImageUrl}
            alt={event.nameEn}
            fill
            className="object-cover"
            sizes="110px"
            unoptimized={isExternalImage(event.bannerImageUrl)}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #E9283D 0%, #2A0410 100%)" }} />
        )}

        {/* 그라디언트 쉐이드 오버레이 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(160deg, rgba(10,6,9,.5) 0%, transparent 42%, transparent 58%, rgba(10,6,9,.46) 100%)",
          }}
        />

        {/* D-DAY 배지 */}
        {dday && (
          <div className="absolute left-2 bottom-2 z-[3] inline-flex items-center px-2 py-[3px] rounded-full bg-[#E9283D] text-white text-[10px] font-black tabular-nums">
            {dday}
          </div>
        )}
      </div>

      {/* ── 티켓 천공선 ── */}
      <div
        className="relative w-px shrink-0 self-stretch"
        style={{
          borderLeft: `2px dashed color-mix(in srgb, ${RED} ${isSelected ? "60%" : "30%"}, ${isSelected ? "#fff" : "#E6E4E8"})`,
        }}
      >
        <div
          className="absolute -top-[9px] -left-[9px] w-[18px] h-[18px] rounded-full"
          style={{ background: notchBg }}
        />
        <div
          className="absolute -bottom-[9px] -left-[9px] w-[18px] h-[18px] rounded-full"
          style={{ background: notchBg }}
        />
      </div>

      {/* ── 본문 + chevron ── */}
      <div className="flex-1 min-w-0 flex items-center">
        {/* 4행 본문 */}
        <div className="flex-1 min-w-0 py-3 pl-[15px] pr-2 flex flex-col justify-center gap-1">
          {/* 1행: 컬렉션명 (동그라미 없음, 그대로 출력) */}
          <p
            className="text-xs font-semibold uppercase tracking-[.06em] truncate"
            style={{ color: RED }}
          >
            {collectionName}
          </p>

          {/* 2행: 이벤트명 — min-h 2행 고정 */}
          <h3
            className="text-base font-semibold line-clamp-2 min-h-[3rem]"
            style={{ color: "#16181C" }}
          >
            {event.nameEn}
          </h3>

          {/* 3행: [캘린더] [기간] [On map 버튼(selected만)] */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
            <span
              className="text-base font-bold tabular-nums whitespace-nowrap shrink-0"
              style={{ color: RED }}
            >
              {dateRange}
            </span>
            {isSelected && placeCount === 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMap?.();
                }}
                className="text-xs px-2.5 py-1 rounded-full bg-white shadow-sm text-muted-foreground shrink-0"
              >
                On map
              </button>
            )}
          </div>

          {/* 4행: [MapPin] [장소명] */}
          <div className="flex items-center gap-0.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {placeCount >= 2 ? `${placeCount} locations` : event.place.nameEn}
            </span>
          </div>
        </div>

        {/* 이벤트 상세 chevron */}
        <Link
          href={`/events/${collectionSlug}/${event.eventSlug}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 self-stretch flex items-center pl-1 pr-3"
          aria-label="View event detail"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* ── 북마크 버튼 ── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.(!isSaved);
        }}
        className="absolute top-2.5 right-2.5 z-[4] w-7 h-7 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
        style={isSaved ? { background: "#C8FF09" } : { background: "rgba(0,0,0,0.32)" }}
        aria-label={isSaved ? "Remove bookmark" : "Bookmark event"}
      >
        <Bookmark
          className="w-4 h-4"
          strokeWidth={1.5}
          strokeLinejoin="miter"
          style={
            isSaved
              ? { fill: "#000", stroke: "#000" }
              : { fill: "none", stroke: "rgba(255,255,255,0.9)" }
          }
        />
      </button>
    </div>
  );
}
