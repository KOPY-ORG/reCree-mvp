"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

interface Props {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string | null;
  onReferenceChange: (file: File) => void;
  onShotChange: (file: File) => void;
  onNext: () => void;
  isUploading: boolean;
}

export function UploadStep1({
  referencePreviewUrl,
  shotPreviewUrl,
  onReferenceChange,
  onShotChange,
  onNext,
  isUploading,
}: Props) {
  const refInputRef = useRef<HTMLInputElement>(null);
  const shotInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-center py-4 border-b border-border/50">
        <span className="font-bold text-base tracking-tight">reCree</span>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-4 py-4">
        {/* 원본 사진 (선택사항) */}
        <button
          type="button"
          onClick={() => refInputRef.current?.click()}
          className="relative flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/40 h-20 overflow-hidden"
        >
          {referencePreviewUrl ? (
            <Image src={referencePreviewUrl} alt="original" fill className="object-cover opacity-60" />
          ) : null}
          <div className="relative flex items-center gap-3 z-10">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Camera className="size-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Original framing</p>
              <p className="text-xs text-muted-foreground">Optional – add reference photo</p>
            </div>
          </div>
        </button>

        {/* 내 리크리샷 (필수) */}
        <button
          type="button"
          onClick={() => shotInputRef.current?.click()}
          className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 min-h-[280px] overflow-hidden"
        >
          {shotPreviewUrl ? (
            <Image src={shotPreviewUrl} alt="my shot" fill className="object-cover" />
          ) : (
            <>
              <Camera className="size-8 text-muted-foreground" />
              <p className="font-semibold text-sm">Your recreeshot</p>
              <p className="text-xs text-muted-foreground">Tap to add...</p>
            </>
          )}
        </button>

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
          onClick={onNext}
          disabled={!shotPreviewUrl || isUploading}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isUploading ? "Uploading..." : "Add your recreeshot"}
        </button>
      </div>
    </div>
  );
}
