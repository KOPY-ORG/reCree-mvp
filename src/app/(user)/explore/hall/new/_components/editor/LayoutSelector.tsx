"use client";

import { useState, useEffect } from "react";
import type { TemplateId, TemplateModeId } from "./editor-types";

// ── 시리얼 번호 훅 ─────────────────────────────────────────────────────────────

function useTimestamp() {
  const [ts, setTs] = useState("····-····-····");

  useEffect(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTs(`${yyyy}-${mm}${dd}-${hh}${mi}`);
  }, []);

  return ts;
}

const FONT_TECH = "var(--font-chakra-petch), 'Chakra Petch', sans-serif";

const FRAME_ASPECT = {
  vertical: "4 / 5",
  horizontal: "5 / 4",
} as const;

// ── 아이콘 (side-by-side 전용) ────────────────────────────────────────────────

function PersonIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 56" width={size} height={Math.round(size * 1.4)} fill="none" aria-hidden>
      <circle cx="20" cy="12" r="9" stroke={color} strokeWidth="2.5" />
      <path d="M6 48 C6 36 10 30 20 30 C30 30 34 36 34 48" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PersonIconFull({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 80" width={size} height={Math.round(size * 2)} fill="none" aria-hidden>
      <circle cx="20" cy="9" r="7.5" stroke={color} strokeWidth="2.5" />
      <path d="M20 18 L20 46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 24 L8 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 24 L32 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 46 L12 68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 46 L28 68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── 프리뷰: Side by side ──────────────────────────────────────────────────────

function SbsVerticalFullPreview() {
  return (
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.vertical, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #0b0b0b", boxSizing: "border-box" }}>
      <div style={{ flex: 1, background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#4a7a00" size={28} />
      </div>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#1a5a80" size={28} />
      </div>
    </div>
  );
}

function SbsVerticalFramePreview() {
  return (
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.vertical, background: "#fff", border: "1px solid #0b0b0b", display: "flex", flexDirection: "column", gap: 4, padding: 8, boxSizing: "border-box" }}>
      <div style={{ flex: 1, background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#4a7a00" size={20} />
      </div>
      <p style={{ fontFamily: FONT_TECH, fontSize: 7, fontWeight: 600, color: "#0b0b0b", textAlign: "center", margin: 0, lineHeight: 1 }}>Artist</p>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#1a5a80" size={20} />
      </div>
      <p style={{ fontFamily: FONT_TECH, fontSize: 7, fontWeight: 600, color: "#0b0b0b", textAlign: "center", margin: 0, lineHeight: 1 }}>ME</p>
    </div>
  );
}

function SbsHorizontalFullPreview() {
  return (
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.horizontal, display: "flex", flexDirection: "row", overflow: "hidden", border: "1px solid #0b0b0b", boxSizing: "border-box" }}>
      <div style={{ flex: 1, background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIconFull color="#4a7a00" size={24} />
      </div>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIconFull color="#1a5a80" size={24} />
      </div>
    </div>
  );
}

function SbsHorizontalFramePreview() {
  return (
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.horizontal, background: "#fff", border: "1px solid #0b0b0b", display: "flex", flexDirection: "row", gap: 4, padding: 8, boxSizing: "border-box" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ flex: 1, width: "100%", background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color="#4a7a00" size={16} />
        </div>
        <p style={{ fontFamily: FONT_TECH, fontSize: 7, fontWeight: 600, color: "#0b0b0b", margin: 0, lineHeight: 1 }}>Artist</p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ flex: 1, width: "100%", background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color="#1a5a80" size={16} />
        </div>
        <p style={{ fontFamily: FONT_TECH, fontSize: 7, fontWeight: 600, color: "#0b0b0b", margin: 0, lineHeight: 1 }}>ME</p>
      </div>
    </div>
  );
}

// ── 프리뷰: 4 cuts ────────────────────────────────────────────────────────────

const FOUR_CUTS_CELLS = [
  { bg: "#C6FD09", fg: "#3a6000" },
  { bg: "#CDE3F2", fg: "#1a5a80" },
  { bg: "#F2D9C7", fg: "#8B4513" },
  { bg: "#EECFE4", fg: "#7B2D8B" },
];

function FourCutsFullPreview({ aspect }: { aspect: string }) {
  const iconSize = aspect === FRAME_ASPECT.vertical ? 20 : 16;
  return (
    <div style={{ width: "100%", aspectRatio: aspect, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", overflow: "hidden", border: "1px solid #0b0b0b", boxSizing: "border-box" }}>
      {FOUR_CUTS_CELLS.map((c, i) => (
        <div key={i} style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color={c.fg} size={iconSize} />
        </div>
      ))}
    </div>
  );
}

function FourCutsFramePreview({ aspect }: { aspect: string }) {
  const iconSize = aspect === FRAME_ASPECT.vertical ? 16 : 13;
  return (
    <div style={{ width: "100%", aspectRatio: aspect, background: "#fff", border: "1px solid #0b0b0b", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 5, padding: 8, boxSizing: "border-box" }}>
      {FOUR_CUTS_CELLS.map((c, i) => (
        <div key={i} style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color={c.fg} size={iconSize} />
        </div>
      ))}
    </div>
  );
}

// ── 프리뷰: Solo ──────────────────────────────────────────────────────────────

function SoloFullPreview({ aspect }: { aspect: string }) {
  return (
    <div style={{ width: "100%", aspectRatio: aspect, background: "#CDE3F2", border: "1px solid #0b0b0b", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <PersonIconFull color="#1a5a80" size={32} />
    </div>
  );
}

function SoloFramePreview({ aspect }: { aspect: string }) {
  return (
    <div style={{ width: "100%", aspectRatio: aspect, background: "#fff", border: "1px solid #0b0b0b", padding: 8, boxSizing: "border-box", display: "flex" }}>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIconFull color="#1a5a80" size={28} />
      </div>
    </div>
  );
}

// ── 레이아웃 데이터 ───────────────────────────────────────────────────────────

interface LayoutOption {
  id: TemplateId;
  frameNum: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const SBS_LAYOUTS: LayoutOption[] = [
  { id: "vertical-full",    frameNum: "01", label: "VERTICAL",   description: "Full bleed", preview: <SbsVerticalFullPreview /> },
  { id: "vertical-frame",   frameNum: "02", label: "VERTICAL",   description: "Framed",     preview: <SbsVerticalFramePreview /> },
  { id: "horizontal-full",  frameNum: "03", label: "HORIZONTAL", description: "Full bleed", preview: <SbsHorizontalFullPreview /> },
  { id: "horizontal-frame", frameNum: "04", label: "HORIZONTAL", description: "Framed",     preview: <SbsHorizontalFramePreview /> },
];

const FOUR_CUTS_LAYOUTS: LayoutOption[] = [
  { id: "vertical-full",    frameNum: "01", label: "VERTICAL",   description: "Full bleed", preview: <FourCutsFullPreview aspect={FRAME_ASPECT.vertical} /> },
  { id: "vertical-frame",   frameNum: "02", label: "VERTICAL",   description: "Framed",     preview: <FourCutsFramePreview aspect={FRAME_ASPECT.vertical} /> },
  { id: "horizontal-full",  frameNum: "03", label: "HORIZONTAL", description: "Full bleed", preview: <FourCutsFullPreview aspect={FRAME_ASPECT.horizontal} /> },
  { id: "horizontal-frame", frameNum: "04", label: "HORIZONTAL", description: "Framed",     preview: <FourCutsFramePreview aspect={FRAME_ASPECT.horizontal} /> },
];

const SOLO_LAYOUTS: LayoutOption[] = [
  { id: "vertical-full",    frameNum: "01", label: "VERTICAL",   description: "Full bleed", preview: <SoloFullPreview aspect={FRAME_ASPECT.vertical} /> },
  { id: "vertical-frame",   frameNum: "02", label: "VERTICAL",   description: "Framed",     preview: <SoloFramePreview aspect={FRAME_ASPECT.vertical} /> },
  { id: "horizontal-full",  frameNum: "03", label: "HORIZONTAL", description: "Full bleed", preview: <SoloFullPreview aspect={FRAME_ASPECT.horizontal} /> },
  { id: "horizontal-frame", frameNum: "04", label: "HORIZONTAL", description: "Framed",     preview: <SoloFramePreview aspect={FRAME_ASPECT.horizontal} /> },
];

function getLayouts(mode: TemplateModeId): LayoutOption[] {
  if (mode === "4-cuts") return FOUR_CUTS_LAYOUTS;
  if (mode === "solo") return SOLO_LAYOUTS;
  return SBS_LAYOUTS;
}

// ── 레이아웃 카드 ─────────────────────────────────────────────────────────────

function LayoutCard({ layout, isSelected, onSelect }: {
  layout: LayoutOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const timestamp = useTimestamp();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      style={{
        position: "relative",
        background: "#fff",
        border: "none",
        borderRadius: 0,
        boxShadow: isSelected
          ? "0 6px 0 -1px #0b0b0b, 0 0 0 1.5px #0b0b0b"
          : "0 0 0 1.5px #0b0b0b",
        padding: isSelected ? "18px 10px 12px" : "10px 10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
        cursor: "pointer",
        transform: isSelected ? "translateY(-2px) rotate(-0.3deg)" : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {isSelected && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 8,
            background: "#C6FD09",
          }}
        />
      )}

      <span style={{
        fontFamily: FONT_TECH,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.2,
        background: "#0b0b0b",
        color: "#fff",
        padding: "4px 8px 3px",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        alignSelf: "flex-start",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}>
        FRAME · {layout.frameNum}
      </span>

      <div style={{ width: "100%" }}>
        {layout.preview}
      </div>

      <p style={{
        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
        fontSize: 8,
        letterSpacing: 0.5,
        color: "#0b0b0b",
        lineHeight: 1,
        margin: 0,
        textAlign: "right",
        alignSelf: "stretch",
      }}>
        {timestamp}
      </p>

      <div
        aria-hidden
        style={{
          height: 1,
          backgroundImage: "linear-gradient(to right, #0b0b0b 50%, transparent 50%)",
          backgroundSize: "6px 1px",
          backgroundRepeat: "repeat-x",
        }}
      />

      <div>
        <p style={{
          fontFamily: FONT_TECH,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.3px",
          lineHeight: 1,
          color: "#0b0b0b",
          margin: 0,
        }}>
          {layout.label}
        </p>
        <p style={{
          fontSize: 13,
          color: "#6b6b6b",
          margin: "3px 0 0",
          lineHeight: 1.3,
        }}>
          {layout.description}
        </p>
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface Props {
  mode: TemplateModeId;
  selected: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  onNext: () => void;
}

export function LayoutSelector({ mode, selected, onSelect, onNext }: Props) {
  const layouts = getLayouts(mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--background)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#0b0b0b",
            margin: 0,
          }}>
            Pick your frame
          </h2>
          <p style={{
            fontSize: 14,
            color: "#666",
            margin: "4px 0 0",
          }}>
            Vertical or horizontal.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {layouts.map((layout) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              isSelected={selected === layout.id}
              onSelect={() => onSelect(layout.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onNext}
          disabled={selected === null}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 9999,
            background: selected === null ? "#e5e5e5" : "#C6FD09",
            border: "none",
            fontWeight: 700,
            fontSize: 16,
            color: selected === null ? "#aaa" : "#0b0b0b",
            cursor: selected === null ? "default" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
