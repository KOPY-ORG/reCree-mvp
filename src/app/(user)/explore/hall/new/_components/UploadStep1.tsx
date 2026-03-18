"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";

interface Props {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string | null;
  onReferenceChange: (file: File) => void;
  onShotChange: (file: File) => void;
  onReferenceRemove: () => void;
  onShotRemove: () => void;
  previewScore: number | null;
  isScoringPreview: boolean;
  scoringDone: boolean;
  onCheckScore: () => void;
  onNext: () => void;
  isUploading: boolean;
  prefillReferenceUrl?: string;
  onRestoreReference?: () => void;
}

function getScoreMessage(score: number): { headline: string; sub: string } {
  if (score >= 90) return { headline: "Incredible!", sub: "You nailed the recreation perfectly." };
  if (score >= 80) return { headline: "Amazing match!", sub: "You've got a great eye for detail." };
  if (score >= 70) return { headline: "Nice work!", sub: "Really close to the original shot." };
  if (score >= 50) return { headline: "Good try!", sub: "A solid recreation — keep it up." };
  return { headline: "Keep going!", sub: "Every attempt gets you closer." };
}

export function UploadStep1({
  referencePreviewUrl,
  shotPreviewUrl,
  onReferenceChange,
  onShotChange,
  onReferenceRemove,
  onShotRemove,
  previewScore,
  isScoringPreview,
  scoringDone,
  onCheckScore,
  onNext,
  isUploading,
  prefillReferenceUrl,
  onRestoreReference,
}: Props) {
  const refInputRef = useRef<HTMLInputElement>(null);
  const shotInputRef = useRef<HTMLInputElement>(null);

  // 카운트업 애니메이션
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!isScoringPreview) {
      setAnimatedScore(0);
      return;
    }
    // 채점 중: 0 → 최대 88까지 랜덤하게 올라가다 슬로다운
    const interval = setInterval(() => {
      setAnimatedScore((prev) => {
        if (prev >= 88) return prev;
        const step = Math.max(1, Math.round((1 - prev / 100) * (Math.random() * 10)));
        return Math.min(88, prev + step);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isScoringPreview]);

  useEffect(() => {
    if (scoringDone && previewScore !== null) {
      // 실제 점수로 이동 (살짝 딜레이 후 snap)
      const t = setTimeout(() => setAnimatedScore(Math.round(previewScore)), 200);
      return () => clearTimeout(t);
    }
  }, [scoringDone, previewScore]);

  const hasShot = !!shotPreviewUrl;
  const hasReference = !!referencePreviewUrl;
  const isLoading = isUploading || isScoringPreview;

  let buttonLabel: string;
  let buttonAction: () => void;
  let buttonDisabled: boolean;

  if (!hasShot) {
    buttonLabel = "Add your recreeshot";
    buttonAction = () => {};
    buttonDisabled = true;
  } else if (!hasReference) {
    buttonLabel = isUploading ? "Uploading..." : "Next";
    buttonAction = onNext;
    buttonDisabled = isLoading;
  } else if (!scoringDone) {
    buttonLabel = isScoringPreview ? "Analyzing..." : "Reveal my score";
    buttonAction = onCheckScore;
    buttonDisabled = isLoading;
  } else {
    buttonLabel = "Next";
    buttonAction = onNext;
    buttonDisabled = false;
  }

  const scoreMessage = scoringDone && previewScore !== null ? getScoreMessage(previewScore) : null;

  return (
    <div className="flex flex-col h-[calc(100dvh-3rem)] px-4 py-4 gap-3">
      {/* 메인 shot 영역 */}
      <div className="relative w-full aspect-[4/5]">
        {/* 리크리샷 업로드 버튼 */}
        <button
          type="button"
          onClick={() => shotInputRef.current?.click()}
          className={`relative w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl overflow-hidden ${shotPreviewUrl ? "" : "border-2 border-dashed border-border bg-muted/20"}`}
        >
          {shotPreviewUrl ? (
            <Image src={shotPreviewUrl} alt="my shot" fill className="object-cover" />
          ) : (
            <>
              <Camera className="size-8 text-muted-foreground" />
              <p className="font-semibold text-sm">Your recreeshot</p>
              <p className="text-xs text-muted-foreground">Tap to add your recreation photo</p>
            </>
          )}
        </button>

        {/* 리크리샷 X 버튼 */}
        {shotPreviewUrl && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShotRemove(); if (shotInputRef.current) shotInputRef.current.value = ""; }}
            className="absolute top-2 right-2 z-20 size-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="size-3 text-white" />
          </button>
        )}

        {/* Original 사진 — 좌상단 오버레이 (X 버튼 포함) */}
        <div className="absolute top-3 left-3 z-10 w-[18%] aspect-[3/4]">
          <button
            type="button"
            onClick={() => refInputRef.current?.click()}
            className={`relative w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg overflow-hidden ${referencePreviewUrl ? "" : "border-2 border-dashed border-border bg-background/80 backdrop-blur-sm"}`}
          >
            {referencePreviewUrl ? (
              <Image src={referencePreviewUrl} alt="original" fill className="object-cover" />
            ) : (
              <>
                <Camera className="size-5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground leading-tight text-center">
                  Original<br />(Optional)
                </p>
              </>
            )}
          </button>
          {referencePreviewUrl && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReferenceRemove(); if (refInputRef.current) refInputRef.current.value = ""; }}
              className="absolute top-1 right-1 z-20 size-4 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="size-3 text-white" />
            </button>
          )}
        </div>

        {/* 채점 중 로딩 오버레이 — 카운트업 숫자 */}
        {isScoringPreview && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 z-20">
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-7xl font-black tracking-tighter leading-none tabular-nums"
                style={{ color: "#C8FF09", textShadow: "0 0 40px rgba(200,255,9,0.6)" }}
              >
                {animatedScore}%
              </span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
                Analyzing...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* prefill reference 복원 버튼 */}
      {!hasReference && prefillReferenceUrl && onRestoreReference && (
        <button
          type="button"
          onClick={onRestoreReference}
          className="w-full py-2.5 rounded-full text-sm font-medium border border-border text-foreground"
        >
          Use original photo
        </button>
      )}

      {/* 점수 결과 영역 */}
      {scoreMessage && previewScore !== null && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex-shrink-0 size-16 rounded-full bg-black flex items-center justify-center shadow-md">
            <span className="text-xl font-black tracking-tight leading-none" style={{ color: "#C8FF09" }}>
              {Math.round(previewScore)}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{scoreMessage.headline}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{scoreMessage.sub}</p>
          </div>
        </div>
      )}

      <input
        ref={refInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReferenceChange(file);
          e.target.value = "";
        }}
      />
      <input
        ref={shotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onShotChange(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={buttonAction}
        disabled={buttonDisabled}
        className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
