"use client";

import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
  onCalculate: () => void;
  onToggle: () => void;
}

export function ScoreSheet({
  open,
  onOpenChange,
  referencePreviewUrl,
  shotPreviewUrl,
  phase,
  score,
  showMatchScore,
  onCalculate,
  onToggle,
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
          <ResultPhase score={score} showMatchScore={showMatchScore} />
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

function ResultPhase({ score, showMatchScore }: {
  score: number; showMatchScore: boolean;
}) {
  const tier = getScoreTier(score);
  const pct = Math.round(score);
  return (
    <div className="px-5 pb-8 text-center">
      <div className="pt-5 pb-2">
        <p className="font-black leading-none" style={{ fontSize: 92, letterSpacing: "-.04em" }}>
          {pct}<span style={{ fontSize: 46 }}>%</span>
        </p>
        <div className="flex items-center justify-center gap-2 mt-2 text-[#8A8E94] text-[13px] font-bold tracking-[.04em] uppercase">
          <span>{tier.label}</span>
          <span className="opacity-40">·</span>
          <span>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} style={{ color: i <= tier.stars ? "#0c0d0e" : "#D6D8DC" }}>
                {i <= tier.stars ? "★" : "☆"}
              </span>
            ))}
          </span>
        </div>
      </div>
      <div className="inline-flex items-center gap-[7px] rounded-full mt-3.5"
           style={{ background: "#F4F5F7", padding: "7px 14px" }}>
        <Sparkles className="shrink-0 text-[#7E838A]" style={{ width: 13, height: 13 }} />
        <span className="text-[12.5px] font-semibold text-[#7E838A]">
          {showMatchScore ? "Badge shown on your shot - toggle below" : "Turn the switch below to place it"}
        </span>
      </div>
    </div>
  );
}
