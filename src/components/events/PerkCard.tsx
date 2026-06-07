"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { EVENT_RED } from "@/lib/event-format";

const FALLBACK = "linear-gradient(135deg, #E9283D 0%, #2A0410 100%)";

export interface PerkCardProps {
  imageUrl: string | null;
  perkUrl: string | null;
  badge: string | null;
  title: string | null;
  detail: string | null;
}

export function PerkCard({ imageUrl, perkUrl, badge, title, detail }: PerkCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex rounded-[14px] overflow-hidden min-h-[110px]"
      style={{ background: "#F7F6F8", border: "1px solid #ECEAEE" }}
    >
      {/* 좌측 썸네일: 88px 폭, 높이는 우측 본문(flex stretch)을 따라감, 최소 110px */}
      <div className="relative flex-shrink-0 w-[88px] min-h-[110px] overflow-hidden">
        {imageUrl ? (
          <>
            {/* 블러 배경 — 좌측 영역 전체 채움 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
            />
            {/* 선명한 이미지 — 4:5 고정 비율, 수직 중앙 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full" style={{ aspectRatio: "4/5" }}>
                <Image
                  src={imageUrl}
                  alt={title ?? ""}
                  fill
                  sizes="88px"
                  className="object-contain"
                  unoptimized={isExternalImage(imageUrl)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: FALLBACK }} />
        )}
      </div>

      {/* 우측 본문 */}
      <div className="flex flex-col flex-1 min-w-0 px-3 py-3">
        {badge && (
          <span
            className="inline-flex self-start items-center px-2 py-[3px] rounded-full text-white font-bold mb-1.5"
            style={{ background: EVENT_RED, fontSize: 10.5, letterSpacing: "0.04em" }}
          >
            {badge}
          </span>
        )}

        {title && (
          <div className="font-bold text-[#16181C] leading-snug" style={{ fontSize: 14 }}>
            {title}
          </div>
        )}

        {detail && (
          <div className="mt-1 flex-1">
            <div
              className={expanded ? "" : "line-clamp-1"}
              style={{ fontSize: 12, color: "#8A8F98", lineHeight: 1.45 }}
            >
              {detail}
            </div>
            <button
              type="button"
              className="mt-1 font-semibold leading-none"
              style={{ fontSize: 11.5, color: EVENT_RED }}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          </div>
        )}

        {perkUrl && (
          <a
            href={perkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-2 self-end"
            style={{ color: EVENT_RED }}
          >
            <ExternalLink size={14} strokeWidth={2.2} />
          </a>
        )}
      </div>
    </div>
  );
}
