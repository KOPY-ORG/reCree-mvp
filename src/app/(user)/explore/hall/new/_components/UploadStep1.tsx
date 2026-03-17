"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

interface Props {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string | null;
  onReferenceChange: (file: File) => void;
  onShotChange: (file: File) => void;
  previewScore: number | null;
  isScoringPreview: boolean;
  scoringDone: boolean;
  onCheckScore: () => void;
  onNext: () => void;
  isUploading: boolean;
}

export function UploadStep1({
  referencePreviewUrl,
  shotPreviewUrl,
  onReferenceChange,
  onShotChange,
  previewScore,
  isScoringPreview,
  scoringDone,
  onCheckScore,
  onNext,
  isUploading,
}: Props) {
  const refInputRef = useRef<HTMLInputElement>(null);
  const shotInputRef = useRef<HTMLInputElement>(null);

  // 버튼 상태 결정
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
    buttonLabel = isScoringPreview ? "Analyzing..." : "Check your match score";
    buttonAction = onCheckScore;
    buttonDisabled = isLoading;
  } else {
    buttonLabel = "Next";
    buttonAction = onNext;
    buttonDisabled = false;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3rem)] px-4 py-4 gap-3">
      {/* 메인 shot 영역 */}
      <div className="relative w-full aspect-[3/4]">
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

        {/* Original 사진 — 좌상단 오버레이 */}
        <button
          type="button"
          onClick={() => refInputRef.current?.click()}
          className={`absolute top-3 left-3 z-10 flex flex-col items-center justify-center gap-1 rounded-xl w-[18%] aspect-[3/4] overflow-hidden ${referencePreviewUrl ? "border border-white" : "border-2 border-dashed border-border bg-background/80 backdrop-blur-sm"}`}
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

        {/* 채점 중 로딩 오버레이 */}
        {isScoringPreview && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 z-20">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex size-24 rounded-full bg-brand/40 animate-ping" />
              <span className="relative inline-flex size-16 rounded-full bg-brand/80 items-center justify-center">
                <span className="text-black text-xs font-bold text-center leading-tight">
                  AI<br />Scoring
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 점수 배지 오버레이 */}
        {scoringDone && previewScore !== null && !isScoringPreview && (
          <div className="absolute top-3 right-3 z-20 bg-brand text-black text-xs font-bold px-2.5 py-1 rounded-full shadow">
            {previewScore}% Match
          </div>
        )}
      </div>

      <input
        ref={refInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReferenceChange(file);
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
