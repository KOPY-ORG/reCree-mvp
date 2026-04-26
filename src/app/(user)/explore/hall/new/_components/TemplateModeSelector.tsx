"use client";

import { useState, useEffect } from "react";
import type { TemplateModeId } from "./editor/editor-types";
import { FONT_TECH, FONT_MONO, PersonIcon, PersonIconFull, StepNextButton } from "./editor/editor-shared";

// ── 시리얼 번호 훅 ────────────────────────────────────────────────────────────

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

// ── 바코드 ───────────────────────────────────────────────────────────────────

function Barcode({ scale = 1 }: { scale?: number }) {
  const widths = [1,2,1,1,2,1,2,1,1,2,1,1,1,2,2,1,1,2,1,1,2,1,2,1,1,1,2,1,1,2,1,2,1,1,1,2,1];
  const GAP = 0.5;
  const H = 13 * scale;
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x: x * scale, w: w * scale });
    x += w + (i % 2 === 0 ? GAP : 0);
  });
  const totalW = x * scale;
  return (
    <svg width={totalW} height={H} viewBox={`0 0 ${totalW} ${H}`} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height={H} fill="#0b0b0b" />
      ))}
    </svg>
  );
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────────

const CARD_SHADOW = (selected: boolean) =>
  selected ? "0 6px 0 -1px #0b0b0b, 0 0 0 1.5px #0b0b0b" : "0 0 0 1.5px #0b0b0b";

const DASHED_LINE_H: React.CSSProperties = {
  height: 1,
  backgroundImage: "linear-gradient(to right, #0b0b0b 50%, transparent 50%)",
  backgroundSize: "6px 1px",
  backgroundRepeat: "repeat-x",
};

const DASHED_LINE_V: React.CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  flexShrink: 0,
  backgroundImage: "linear-gradient(to bottom, #0b0b0b 50%, transparent 50%)",
  backgroundSize: "1px 6px",
  backgroundRepeat: "repeat-y",
};

// ── 모드 데이터 ───────────────────────────────────────────────────────────────

interface ModeOption {
  id: TemplateModeId;
  typeCode: TypeCode;
  badge: string;
  title: string;
  description: string;
  meta: string;
}

const MODES: ModeOption[] = [
  {
    id: "side-by-side",
    typeCode: "2S",
    badge: "POSE LIKE THEM",
    title: "SIDE BY SIDE",
    description: "Same spot. Same pose. Together.",
    meta: "2 PHOTOS",
  },
  {
    id: "4-cuts",
    typeCode: "4C",
    badge: "PHOTOBOOTH",
    title: "4 CUTS",
    description: "Four shots. One memory.",
    meta: "4 PHOTOS",
  },
  {
    id: "solo",
    typeCode: "1S",
    badge: "QUICKEST",
    title: "SOLO SHOT",
    description: "Just you at the spot.",
    meta: "1 PHOTO",
  },
];

// ── Hero 카드 (Side by side) ──────────────────────────────────────────────────

function HeroIllustrationBox() {
  return (
    <div style={{
      width: 78, height: 96, flexShrink: 0,
      border: "1.5px solid #0b0b0b",
      padding: 3, background: "#fff", boxSizing: "border-box",
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <div style={{ flex: 1, background: "#C6FD09", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#3a6a00" size={20} strokeWidth={3.5} />
      </div>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIcon color="#1a5a80" size={20} strokeWidth={3.5} />
      </div>
    </div>
  );
}

function HeroTicketCard({ mode, isSelected, onSelect }: {
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
        padding: "14px 16px",
        boxShadow: CARD_SHADOW(isSelected),
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
      {isSelected && (
        <div aria-hidden style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 8, background: "#C6FD09",
        }} />
      )}

      {/* 왼쪽: 일러스트 + 시리얼 */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <HeroIllustrationBox />
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: 1, color: "#0b0b0b", lineHeight: 1, margin: "5px 0 0" }}>
          № {serial}
        </p>
      </div>

      <div aria-hidden style={DASHED_LINE_V} />

      {/* 오른쪽: 콘텐츠 */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 180 }}>
        {/* 상단: 배지 + 제목 + 설명 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700, letterSpacing: 1,
              color: "#C6FD09", background: "#0b0b0b",
              padding: "4px 8px 3px", display: "inline-flex", alignItems: "center",
              lineHeight: 1, flexShrink: 0, whiteSpace: "nowrap",
              WebkitTextStroke: "0.3px #C6FD09",
            }}>
              {mode.badge}
            </span>
            {isSelected && (
              <span style={{
                fontFamily: FONT_TECH, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                background: "#C6FD09", color: "#0b0b0b",
                padding: "4px 8px 3px", display: "inline-flex", alignItems: "center", lineHeight: 1,
              }}>
                ▶ PICKED
              </span>
            )}
          </div>
          <p style={{ fontFamily: FONT_TECH, fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.5px", color: "#0b0b0b", margin: "0 0 4px" }}>
            {mode.title}
          </p>
          <p style={{ fontSize: 12, color: "#555", lineHeight: 1.4, margin: 0 }}>
            {mode.description}
          </p>
        </div>

        {/* 하단: 매치 스코어 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#888", margin: 0, letterSpacing: 1 }}>
              ★ MATCH SCORE
            </p>
            <p style={{ fontFamily: FONT_TECH, fontSize: 9, color: "#666", fontWeight: 600, margin: 0 }}>
              {mode.meta}
            </p>
          </div>
          {isSelected ? (
            /* ── Revealed: 긁힌 후 드러난 영역 ── */
            <div style={{
              width: "100%", height: 60,
              background: "linear-gradient(140deg, #fafff0 0%, #e7ffb3 35%, #C8FF09 70%, #e0ffaa 100%)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 12px", boxSizing: "border-box",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#777", margin: 0, letterSpacing: 0.8, lineHeight: 1 }}>
                  POSE SIMILARITY
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#333", margin: 0, letterSpacing: 0.3, lineHeight: 1 }}>
                  ★★★★★ HIGH MATCH
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: 7, color: "#666", margin: 0, letterSpacing: 0.3, lineHeight: 1 }}>
                  AI-scored after upload
                </p>
              </div>
              <p style={{ fontFamily: FONT_TECH, fontSize: 28, fontWeight: 700, color: "#0b0b0b", letterSpacing: "-1px", margin: 0, lineHeight: 1 }}>
                98%
              </p>
            </div>
          ) : (
            /* ── Scratch: 은박 코팅 ── */
            <div style={{
              width: "100%", height: 60, position: "relative", overflow: "hidden",
              background: "repeating-linear-gradient(-45deg, #b8b8b8 0px, #b8b8b8 2px, #d4d4d4 2px, #d4d4d4 9px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
            }}>
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(130deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 50%)",
              }} />
              <p style={{
                fontFamily: FONT_TECH, fontSize: 22, fontWeight: 700,
                color: "rgba(0,0,0,0.12)", letterSpacing: "-0.5px", margin: 0, lineHeight: 1,
                userSelect: "none",
              }}>
                ??%
              </p>
              <p style={{ fontFamily: FONT_TECH, fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", letterSpacing: "0.12em", margin: 0 }}>
                SCRATCH TO REVEAL
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Compact 카드 (4-cuts, solo) — 78:96 비율 유지 스케일다운 (46×57) ──────────

function CompactIllustrationBox({ kind }: { kind: TemplateModeId }) {
  const boxStyle: React.CSSProperties = {
    width: 46, height: 57, flexShrink: 0,
    border: "1px solid #0b0b0b",
    padding: 2, background: "#fff", boxSizing: "border-box",
  };

  if (kind === "4-cuts") {
    const cells = [
      { bg: "#C6FD09", fg: "#3a6000" },
      { bg: "#CDE3F2", fg: "#1a5a80" },
      { bg: "#F2D9C7", fg: "#8B4513" },
      { bg: "#EECFE4", fg: "#7B2D8B" },
    ];
    return (
      <div style={{ ...boxStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PersonIconFull color={c.fg} size={8} strokeWidth={3} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, display: "flex" }}>
      <div style={{ flex: 1, background: "#CDE3F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PersonIconFull color="#1a5a80" size={13} strokeWidth={3} />
      </div>
    </div>
  );
}

function CompactTicketCard({ mode, isSelected, onSelect }: {
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
        padding: "12px 10px 10px",
        boxShadow: CARD_SHADOW(isSelected),
        borderRadius: 0,
        border: "none",
        transform: isSelected ? "translateX(3px)" : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        gap: 8,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {isSelected && (
        <div aria-hidden style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 6, background: "#C6FD09",
        }} />
      )}

      {/* 왼쪽: 일러스트 박스 + 시리얼 */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <CompactIllustrationBox kind={mode.id} />
        <p style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: 0.5, color: "#0b0b0b", lineHeight: 1, margin: "4px 0 0", whiteSpace: "nowrap" }}>
          № {serial.replace("RC-", "")}
        </p>
      </div>

      <div aria-hidden style={DASHED_LINE_V} />

      {/* 오른쪽: 콘텐츠 */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 57 }}>
        {/* 상단: 배지 + 제목 + 설명 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT_TECH, fontSize: 7, fontWeight: 700, letterSpacing: 0.6,
              color: "#C6FD09", background: "#0b0b0b",
              padding: "3px 5px 2px", lineHeight: 1,
              display: "inline-flex", alignItems: "center",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {mode.badge}
            </span>
            {isSelected && (
              <span style={{
                fontFamily: FONT_TECH, fontSize: 7, fontWeight: 700,
                background: "#C6FD09", color: "#0b0b0b",
                padding: "3px 5px 2px", lineHeight: 1,
              }}>▶</span>
            )}
          </div>
          <p style={{ fontFamily: FONT_TECH, fontSize: 14, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.3px", color: "#0b0b0b", margin: "0 0 3px" }}>
            {mode.title}
          </p>
          <p style={{ fontSize: 9, color: "#666", lineHeight: 1.3, margin: 0 }}>
            {mode.description}
          </p>
        </div>

        {/* 하단: 바코드 + 메타 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <Barcode scale={0.55} />
          <span style={{ fontFamily: FONT_TECH, fontSize: 8, color: "#666", fontWeight: 600 }}>
            {mode.meta}
          </span>
        </div>
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
  const hero = MODES[0];
  const secondary = MODES.slice(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--background)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: "#0b0b0b", margin: 0 }}>
            Pick your recreeshot style
          </h2>
          <p style={{ fontSize: 14, color: "#666", margin: "4px 0 0" }}>
            Three ways to recreate the shot.
          </p>
        </div>

        <HeroTicketCard
          mode={hero}
          isSelected={selected === hero.id}
          onSelect={() => onSelect(hero.id)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {secondary.map((mode) => (
            <CompactTicketCard
              key={mode.id}
              mode={mode}
              isSelected={selected === mode.id}
              onSelect={() => onSelect(mode.id)}
            />
          ))}
        </div>
      </div>

      <StepNextButton label="Continue" onClick={onNext} disabled={selected === null} />
    </div>
  );
}
