"use client";

import type { TemplateId } from "./editor-types";

interface Props {
  templateId: TemplateId;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  onNext: () => void;
}

export function ReCreeshotEditor({ templateId, referencePreviewUrl, shotPreviewUrl, onNext }: Props) {
  const isVertical = templateId.startsWith("vertical");
  const isFramed = templateId.endsWith("frame");

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-4">
        {/* 정적 템플릿 미리보기 */}
        <div
          className={`w-full mx-auto rounded-2xl overflow-hidden ${isFramed ? "bg-white p-4" : "bg-background"}`}
          style={{ aspectRatio: isVertical ? "4/5" : "5/4", maxWidth: 340 }}
        >
          <div className={`w-full h-full flex ${isVertical ? "flex-col" : "flex-row"} ${isFramed ? "gap-3" : ""}`}>
            {/* 원본 슬롯 */}
            <div className={`flex-1 flex flex-col ${isFramed ? "gap-1 items-center" : ""}`}>
              <div
                className="w-full flex-1 overflow-hidden bg-muted"
                style={{ borderRadius: isFramed ? 6 : 0 }}
              >
                {referencePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={referencePreviewUrl} alt="Original" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Original</p>
                  </div>
                )}
              </div>
              {isFramed && <p className="text-[9px] font-medium text-black shrink-0">Artist</p>}
            </div>

            {/* 재현 슬롯 */}
            <div className={`flex-1 flex flex-col ${isFramed ? "gap-1 items-center" : ""}`}>
              <div
                className="w-full flex-1 overflow-hidden bg-muted"
                style={{ borderRadius: isFramed ? 6 : 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shotPreviewUrl} alt="Me" className="w-full h-full object-cover" />
              </div>
              {isFramed && <p className="text-[9px] font-medium text-black shrink-0">ME</p>}
            </div>
          </div>
        </div>

        {/* 에디터 기능 안내 (placeholder) */}
        <div className="rounded-2xl border border-dashed border-border p-4 space-y-2 text-center">
          <p className="text-sm font-semibold">Decoration tools coming soon</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Frame color · Text · Stickers · Location tag · Match score
          </p>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
