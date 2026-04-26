"use client";

import { useState, useEffect } from "react";
import type { TemplateId, TemplateModeId } from "./editor-types";
import { FONT_TECH, FONT_MONO, PersonIcon, PersonIconFull, StepNextButton } from "./editor-shared";

// ── 타임스탬프 훅 ─────────────────────────────────────────────────────────────

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

const FRAME_ASPECT = {
  vertical: "4 / 5",
  horizontal: "5 / 4",
} as const;

// ── 프리뷰: Side by side ──────────────────────────────────────────────────────

function SbsVerticalFullPreview() {
  return (
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.vertical, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--palette-gray-700)", boxSizing: "border-box" }}>
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
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.vertical, background: "#fff", border: "1px solid var(--palette-gray-700)", display: "flex", flexDirection: "column", gap: 4, padding: 8, boxSizing: "border-box" }}>
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
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.horizontal, display: "flex", flexDirection: "row", overflow: "hidden", border: "1px solid var(--palette-gray-700)", boxSizing: "border-box" }}>
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
    <div style={{ width: "100%", aspectRatio: FRAME_ASPECT.horizontal, background: "#fff", border: "1px solid var(--palette-gray-700)", display: "flex", flexDirection: "row", gap: 4, padding: 8, boxSizing: "border-box" }}>
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

function FourCutsPreview({ aspect, framed }: { aspect: string; framed: boolean }) {
  const iconSize = framed
    ? (aspect === FRAME_ASPECT.vertical ? 16 : 13)
    : (aspect === FRAME_ASPECT.vertical ? 20 : 16);
  return (
    <div style={{
      width: "100%",
      aspectRatio: aspect,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      border: "1px solid var(--palette-gray-700)",
      boxSizing: "border-box",
      ...(framed
        ? { background: "#fff", padding: 8, gap: 5 }
        : { overflow: "hidden" }),
    }}>
      {FOUR_CUTS_CELLS.map((c, i) => (
        <div key={i} style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color={c.fg} size={iconSize} />
        </div>
      ))}
    </div>
  );
}

// ── 프리뷰: Solo ──────────────────────────────────────────────────────────────

function SoloPreview({ aspect, framed }: { aspect: string; framed: boolean }) {
  const iconSize = framed ? 28 : 32;
  return (
    <div style={{
      width: "100%",
      aspectRatio: aspect,
      border: "1px solid var(--palette-gray-700)",
      boxSizing: "border-box",
      display: "flex",
      ...(framed
        ? { background: "#fff", padding: 8 }
        : { background: "#CDE3F2", alignItems: "center", justifyContent: "center" }),
    }}>
      {framed ? (
        <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonIconFull color="#1a5a80" size={iconSize} />
        </div>
      ) : (
        <PersonIconFull color="#1a5a80" size={iconSize} />
      )}
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
  { id: "vertical-full",    frameNum: "01", label: "VERTICAL",   description: "Full bleed", preview: <FourCutsPreview aspect={FRAME_ASPECT.vertical}   framed={false} /> },
  { id: "vertical-frame",   frameNum: "02", label: "VERTICAL",   description: "Framed",     preview: <FourCutsPreview aspect={FRAME_ASPECT.vertical}   framed={true}  /> },
  { id: "horizontal-full",  frameNum: "03", label: "HORIZONTAL", description: "Full bleed", preview: <FourCutsPreview aspect={FRAME_ASPECT.horizontal} framed={false} /> },
  { id: "horizontal-frame", frameNum: "04", label: "HORIZONTAL", description: "Framed",     preview: <FourCutsPreview aspect={FRAME_ASPECT.horizontal} framed={true}  /> },
];

const SOLO_LAYOUTS: LayoutOption[] = [
  { id: "vertical-full",    frameNum: "01", label: "VERTICAL",   description: "Full bleed", preview: <SoloPreview aspect={FRAME_ASPECT.vertical}   framed={false} /> },
  { id: "vertical-frame",   frameNum: "02", label: "VERTICAL",   description: "Framed",     preview: <SoloPreview aspect={FRAME_ASPECT.vertical}   framed={true}  /> },
  { id: "horizontal-full",  frameNum: "03", label: "HORIZONTAL", description: "Full bleed", preview: <SoloPreview aspect={FRAME_ASPECT.horizontal} framed={false} /> },
  { id: "horizontal-frame", frameNum: "04", label: "HORIZONTAL", description: "Framed",     preview: <SoloPreview aspect={FRAME_ASPECT.horizontal} framed={true}  /> },
];

function getLayouts(mode: TemplateModeId): LayoutOption[] {
  if (mode === "4-cuts") return FOUR_CUTS_LAYOUTS;
  if (mode === "solo") return SOLO_LAYOUTS;
  return SBS_LAYOUTS;
}

// ── 레이아웃 카드 ─────────────────────────────────────────────────────────────

function LayoutCard({ layout, isSelected, onSelect, timestamp }: {
  layout: LayoutOption;
  isSelected: boolean;
  onSelect: () => void;
  timestamp: string;
}) {
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
        padding: "18px 10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
        cursor: "pointer",
        transform: isSelected ? "translateY(-2px)" : "none",
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
        fontFamily: FONT_MONO,
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
  const timestamp = useTimestamp();

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
              timestamp={timestamp}
            />
          ))}
        </div>
      </div>

      <StepNextButton label="Next" onClick={onNext} disabled={selected === null} />
    </div>
  );
}
