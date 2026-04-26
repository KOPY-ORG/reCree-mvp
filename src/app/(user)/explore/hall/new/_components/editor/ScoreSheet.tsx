"use client";

import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { StickerStyle } from "./editor-types";

export const SCORE_COLORS = [
  "#C8FF09",
  "#FFD60A",
  "#FF6B35",
  "#FF4757",
  "#A29BFE",
  "#000000",
  "#ffffff",
];

export function isDark(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

function getScoreTier(score: number) {
  if (score >= 90) return { label: "LEGENDARY", stars: 5 };
  if (score >= 75) return { label: "HIGH MATCH", stars: 4 };
  if (score >= 60) return { label: "GOOD MATCH", stars: 3 };
  if (score >= 45) return { label: "FAIR MATCH", stars: 2 };
  return { label: "KEEP TRYING", stars: 1 };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  phase: "idle" | "calculating" | "result";
  score: number | null;
  showMatchScore: boolean;
  selectedStyle: StickerStyle;
  selectedColor: string;
  onCalculate: () => void;
  onStyleChange: (style: StickerStyle) => void;
  onColorChange: (color: string) => void;
  onPlace: () => void;
  onRemove: () => void;
}

export function ScoreSheet({
  open,
  onOpenChange,
  referencePreviewUrl,
  shotPreviewUrl,
  phase,
  score,
  showMatchScore,
  selectedStyle,
  selectedColor,
  onCalculate,
  onStyleChange,
  onColorChange,
  onPlace,
  onRemove,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pt-0 pb-safe max-h-[85vh] overflow-y-auto">
        <SheetTitle className="sr-only">Match Score</SheetTitle>
        <div className="mx-auto mt-3 mb-1 w-10 h-1 rounded-full bg-muted/60" />

        {phase === "idle" && (
          <IdlePhase
            referencePreviewUrl={referencePreviewUrl}
            shotPreviewUrl={shotPreviewUrl}
            onCalculate={onCalculate}
          />
        )}
        {phase === "calculating" && (
          <CalculatingPhase
            referencePreviewUrl={referencePreviewUrl}
            shotPreviewUrl={shotPreviewUrl}
          />
        )}
        {phase === "result" && score != null && (
          <ResultPhase
            score={score}
            showMatchScore={showMatchScore}
            selectedStyle={selectedStyle}
            selectedColor={selectedColor}
            onStyleChange={onStyleChange}
            onColorChange={onColorChange}
            onPlace={() => { onPlace(); onOpenChange(false); }}
            onRemove={() => { onRemove(); onOpenChange(false); }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── IdlePhase ─────────────────────────────────────────────────────────────────

function PhotoVsPhoto({ referenceUrl, shotUrl }: { referenceUrl: string | null; shotUrl: string }) {
  return (
    <div className="flex items-center justify-center gap-3 my-4">
      <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0">
        {referenceUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={referenceUrl} alt="Artist ref" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
      <span className="text-sm font-semibold text-muted-foreground shrink-0">VS</span>
      <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shotUrl} alt="Your shot" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function IdlePhase({
  referencePreviewUrl,
  shotPreviewUrl,
  onCalculate,
}: {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  onCalculate: () => void;
}) {
  return (
    <div className="px-5 pb-8">
      <h2 className="text-xl font-bold mt-3">Match score</h2>
      <p className="text-sm text-muted-foreground mt-0.5">See how close your shot is to the artist&apos;s</p>

      <PhotoVsPhoto referenceUrl={referencePreviewUrl} shotUrl={shotPreviewUrl} />

      <div className="text-center space-y-1 mb-6">
        <p className="text-[11px] tracking-widest text-muted-foreground font-medium uppercase">
          Pose · Composition · Location
        </p>
        <p className="text-sm text-muted-foreground italic">AI compares your shot to the artist reference</p>
      </div>

      <button
        type="button"
        onClick={onCalculate}
        className="w-full py-4 rounded-full bg-brand text-black font-bold text-base flex items-center justify-center gap-2"
      >
        <Sparkles className="size-4" />
        Calculate match
      </button>
    </div>
  );
}

// ── CalculatingPhase ──────────────────────────────────────────────────────────

function CalculatingPhase({
  referencePreviewUrl,
  shotPreviewUrl,
}: {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
}) {
  return (
    <div className="px-5 pb-10">
      <h2 className="text-xl font-bold mt-3">Analyzing match<AnimatedDots /></h2>

      {/* 스캔 라인 사진 영역 */}
      <div className="flex items-center justify-center gap-3 my-6">
        <ScannedPhoto url={referencePreviewUrl} delay="0s" />
        <span className="text-sm font-semibold text-muted-foreground shrink-0">VS</span>
        <ScannedPhoto url={shotPreviewUrl} delay="0.3s" />
      </div>
    </div>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 ml-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-[pulse_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.2}s` }}
        >.</span>
      ))}
    </span>
  );
}

function ScannedPhoto({ url, delay }: { url: string | null; delay: string }) {
  return (
    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-muted" />
      )}
      {/* 스캔 라인 */}
      <div
        className="absolute inset-x-0 h-0.5 bg-brand shadow-[0_0_8px_2px_#C8FF09]"
        style={{
          animation: "scanline 1.6s linear infinite",
          animationDelay: delay,
          top: 0,
        }}
      />
      {/* 브랜드 컬러 오버레이 (옅게) */}
      <div className="absolute inset-0 bg-brand/10 animate-pulse" />
    </div>
  );
}

// ── ResultPhase ───────────────────────────────────────────────────────────────

const STYLES: { id: StickerStyle; label: string }[] = [
  { id: "pill", label: "PILL" },
  { id: "stamp", label: "STAMP" },
  { id: "ribbon", label: "RIBBON" },
  { id: "ticket", label: "TICKET" },
];

function StylePreview({ style, score, color }: { style: StickerStyle; score: number; color: string }) {
  const textColor = isDark(color) ? "#ffffff" : "#000000";
  const pct = Math.round(score);

  if (style === "pill") {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{ background: color }}
      >
        <span className="text-lg font-black leading-none" style={{ color: textColor }}>{pct}%</span>
        <span className="text-[10px] font-bold tracking-wider leading-none" style={{ color: textColor }}>MATCH</span>
      </div>
    );
  }
  if (style === "stamp") {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-full border-2 border-dashed"
        style={{ width: 72, height: 72, background: color, borderColor: textColor }}
      >
        <span className="text-xl font-black leading-none" style={{ color: textColor }}>{pct}</span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: textColor }}>MATCH</span>
      </div>
    );
  }
  if (style === "ribbon") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111]">
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-bold text-white tracking-wider">POSE</span>
          <span className="text-[9px] font-bold text-white tracking-wider">MATCH</span>
        </div>
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
      </div>
    );
  }
  // ticket
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-[#F5F3EE] border border-[#E0DDD5]" style={{ minWidth: 72 }}>
      <span className="text-[8px] text-[#999] tracking-wider mb-0.5">N° MATCH</span>
      <span className="text-xl font-black leading-none" style={{ color }}>{pct}%</span>
      <span className="text-[10px] mt-0.5" style={{ color }}>{"★".repeat(Math.round(getScoreTier(score).stars))}</span>
    </div>
  );
}

function ResultPhase({
  score,
  showMatchScore,
  selectedStyle,
  selectedColor,
  onStyleChange,
  onColorChange,
  onPlace,
  onRemove,
}: {
  score: number;
  showMatchScore: boolean;
  selectedStyle: StickerStyle;
  selectedColor: string;
  onStyleChange: (s: StickerStyle) => void;
  onColorChange: (c: string) => void;
  onPlace: () => void;
  onRemove: () => void;
}) {
  const tier = getScoreTier(score);
  const pct = Math.round(score);

  return (
    <div className="px-5 pb-8">
      <h2 className="text-xl font-bold mt-3">{pct}% match</h2>
      <p className="text-sm text-muted-foreground mt-0.5">Pick a sticker style — drag onto your shot</p>

      {/* Score display */}
      <div className="text-center py-5 border-b border-border/30">
        <p className="text-7xl font-black leading-none">{pct}%</p>
        <p className="text-[11px] tracking-widest text-muted-foreground font-medium mt-2 uppercase">
          {tier.label} · {"★".repeat(tier.stars)}{"☆".repeat(5 - tier.stars)}
        </p>
      </div>

      {/* Sticker style grid */}
      <div className="mt-4 mb-1">
        <p className="text-[10px] tracking-widest text-muted-foreground font-medium uppercase mb-3">Sticker Style</p>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onStyleChange(id)}
              className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-colors ${
                selectedStyle === id ? "border-brand bg-brand/5" : "border-border bg-muted/20"
              }`}
            >
              <StylePreview style={id} score={score} color={selectedColor} />
              <span className="text-[10px] tracking-widest text-muted-foreground font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="mt-4 mb-5">
        <p className="text-[10px] tracking-widest text-muted-foreground font-medium uppercase mb-3">Color</p>
        <div className="flex gap-2 flex-wrap">
          {SCORE_COLORS.map((c) => {
            const selected = c.toLowerCase() === selectedColor.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={`size-9 rounded-full transition-transform ${selected ? "scale-125 ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c, boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPlace}
          className="flex-1 py-4 rounded-full bg-brand text-black font-bold text-base"
        >
          {showMatchScore ? "Update sticker" : "Place sticker →"}
        </button>
        {showMatchScore && (
          <button
            type="button"
            onClick={onRemove}
            className="px-5 py-4 rounded-full bg-muted text-muted-foreground font-semibold text-sm"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
