"use client";

import { useState, useEffect } from "react";
import type { TemplateModeId } from "./editor/editor-types";
import { FONT_TECH, FONT_MONO, PersonIcon, PersonIconFull, StepNextButton } from "./editor/editor-shared";

// ── 시리얼 번호 훅 ─────────────────────────────────────────────────────────────

type TypeCode = "2S" | "4C" | "1S";

function useSerialNumber(typeCode: TypeCode) {
  const [serial, setSerial] = useState(`RC-${typeCode}-····`);

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSerial(`RC-${typeCode}-${mm}${dd}`);
  }, [typeCode]);

  return serial;
}

// ── 바코드 ────────────────────────────────────────────────────────────────────

function Barcode() {
  const widths = [1,2,1,1,2,1,2,1,1,2,1,1,1,2,2,1,1,2,1,1,2,1,2,1,1,1,2,1,1,2,1,2,1,1,1,2,1];
  const GAP = 0.5;
  const H = 13;
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w + (i % 2 === 0 ? GAP : 0);
  });
  return (
    <svg width={x} height={H} viewBox={`0 0 ${x} ${H}`} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height={H} fill="#0b0b0b" />
      ))}
    </svg>
  );
}

// ── 일러스트 박스 ─────────────────────────────────────────────────────────────────

function IllustrationBox({ kind }: { kind: TemplateModeId }) {
  const boxStyle: React.CSSProperties = {
    width: 78,
    height: 96,
    flexShrink: 0,
    border: "1.5px solid #0b0b0b",
    padding: 3,
    background: "#fff",
    boxSizing: "border-box",
  };

  if (kind === "side-by-side") {
    return (
      <div style={{ ...boxStyle, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ flex: 1, background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIcon color="#3a6a00" size={20} strokeWidth={3.5} />
        </div>
        <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIcon color="#1a5a80" size={20} strokeWidth={3.5} />
        </div>
      </div>
    );
  }

  if (kind === "4-cuts") {
    const cells = [
      { bg: "#C6FD09", fg: "#3a6000" },
      { bg: "#CDE3F2", fg: "#1a5a80" },
      { bg: "#F2D9C7", fg: "#8B4513" },
      { bg: "#EECFE4", fg: "#7B2D8B" },
    ];
    return (
      <div style={{ ...boxStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 3 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PersonIconFull color={c.fg} size={12} strokeWidth={3} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, display: "flex" }}>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIconFull color="#1a5a80" size={22} strokeWidth={3} />
      </div>
    </div>
  );
}

// ── 모드 데이터 ───────────────────────────────────────────────────────────────

interface ModeOption {
  id: TemplateModeId;
  typeCode: TypeCode;
  badge: string;
  title: string;
  description: string;
  meta: string;
  hasScratch: boolean;
}

const MODES: ModeOption[] = [
  {
    id: "side-by-side",
    typeCode: "2S",
    badge: "POSE LIKE THEM",
    title: "SIDE BY SIDE",
    description: "Same spot. Same pose. Together.",
    meta: "2 PHOTOS",
    hasScratch: true,
  },
  {
    id: "4-cuts",
    typeCode: "4C",
    badge: "PHOTOBOOTH",
    title: "4 CUTS",
    description: "Four shots. One memory.",
    meta: "4 PHOTOS",
    hasScratch: false,
  },
  {
    id: "solo",
    typeCode: "1S",
    badge: "QUICKEST",
    title: "SOLO SHOT",
    description: "Just you at the spot.",
    meta: "1 PHOTO",
    hasScratch: false,
  },
];

// ── 티켓 카드 ─────────────────────────────────────────────────────────────────

function TicketCard({ mode, isSelected, onSelect }: {
  mode: ModeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const serial = useSerialNumber(mode.typeCode);
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        position: "relative",
        width: "100%",
        background: "#fff",
        padding: "14px 16px 12px",
        boxShadow: isSelected
          ? "0 6px 0 -1px #0b0b0b, 0 0 0 1.5px #0b0b0b"
          : "0 0 0 1.5px #0b0b0b",
        borderRadius: 0,
        border: "none",
        transform: isSelected ? "translateX(3px)" : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        gap: 10,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {/* 라임 인덱스 바 (선택 시) */}
      {isSelected && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: "#C6FD09",
          }}
        />
      )}

      {/* 왼쪽: 일러스트 박스 + 시리얼 번호 */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <IllustrationBox kind={mode.id} />
        <p style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
          letterSpacing: 1,
          color: "#0b0b0b",
          lineHeight: 1,
          margin: "5px 0 0",
        }}>
          № {serial}
        </p>
      </div>

      {/* 세로 점선 구분선 */}
      <div
        aria-hidden
        style={{
          width: 1,
          alignSelf: "stretch",
          flexShrink: 0,
          backgroundImage: "linear-gradient(to bottom, #0b0b0b 50%, transparent 50%)",
          backgroundSize: "1px 6px",
          backgroundRepeat: "repeat-y",
        }}
      />

      {/* 오른쪽: 콘텐츠 — 상단 그룹 + 하단 고정 */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 112 }}>
        {/* 상단 그룹: 배지 + 제목 + 설명 */}
        <div>
          {/* 배지 행 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontFamily: FONT_TECH,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              color: "#C6FD09",
              background: "#0b0b0b",
              padding: "4px 8px 3px",
              display: "inline-flex",
              alignItems: "center",
              lineHeight: 1,
              flexShrink: 0,
              whiteSpace: "nowrap",
              WebkitTextStroke: "0.3px #C6FD09",
            }}>
              {mode.badge}
            </span>
            {isSelected && (
              <span style={{
                fontFamily: FONT_TECH,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
                background: "#C6FD09",
                color: "#0b0b0b",
                padding: "4px 8px 3px",
                display: "inline-flex",
                alignItems: "center",
                lineHeight: 1,
              }}>
                ▶ PICKED
              </span>
            )}
          </div>

          {/* 제목 + 설명 */}
          <p style={{
            fontFamily: FONT_TECH,
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.5px",
            color: "#0b0b0b",
            margin: "0 0 3px",
          }}>
            {mode.title}
          </p>
          <p style={{
            fontSize: 12,
            color: "#555",
            lineHeight: 1.4,
            margin: 0,
          }}>
            {mode.description}
          </p>
        </div>

        {/* 하단: Scratch 또는 바코드 */}
        {mode.hasScratch ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              background: isSelected
                ? "#C6FD09"
                : "linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), repeating-linear-gradient(-45deg, #aaa 0px, #aaa 2px, #d4d4d4 2px, #d4d4d4 8px)",
              fontFamily: FONT_TECH,
              fontSize: 10,
              fontWeight: 700,
              color: isSelected ? "#0b0b0b" : "#333",
              letterSpacing: "0.04em",
              width: 64,
              padding: "5px 0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {isSelected ? "98%" : "SCRATCH"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#888", lineHeight: 1.2, margin: 0 }}>MATCH</p>
              <p style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#888", lineHeight: 1.2, margin: 0 }}>SCORE</p>
            </div>
            <p style={{ fontFamily: FONT_TECH, fontSize: 9, color: "#666", fontWeight: 600, margin: "0 0 0 auto" }}>{mode.meta}</p>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Barcode />
            <span style={{ fontFamily: FONT_TECH, fontSize: 9, color: "#666", fontWeight: 600 }}>{mode.meta}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface Props {
  selected: TemplateModeId | null;
  onSelect: (id: TemplateModeId) => void;
  onNext: () => void;
}

export function TemplateModeSelector({ selected, onSelect, onNext }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--background)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#0b0b0b",
            margin: 0,
          }}>
            Pick your recreeshot style
          </h2>
          <p style={{
            fontSize: 14,
            color: "#666",
            margin: "4px 0 0",
          }}>
            Three ways to recreate the shot.
          </p>
        </div>

        {MODES.map((mode) => (
          <TicketCard
            key={mode.id}
            mode={mode}
            isSelected={selected === mode.id}
            onSelect={() => onSelect(mode.id)}
          />
        ))}
      </div>

      <StepNextButton label="Continue" onClick={onNext} disabled={selected === null} />
    </div>
  );
}
