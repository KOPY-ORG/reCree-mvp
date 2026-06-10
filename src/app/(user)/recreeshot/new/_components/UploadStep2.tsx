"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { StickerBadgeOption } from "./editor/editor-types";

interface SelectedPlace {
  id: string;
  nameEn: string | null;
  nameKo: string | null;
}

interface Props {
  compositeUrl?: string | null;
  selectedPlace: SelectedPlace | null;
  badgeOptions: StickerBadgeOption[];
  onShare: (data: {
    story: string;
    tips: string;
    showBadge: boolean;
  }) => void;
  isSubmitting: boolean;
}

export function UploadStep2({
  compositeUrl,
  selectedPlace,
  badgeOptions,
  onShare,
  isSubmitting,
}: Props) {
  const [story, setStory] = useState("");
  const [tips, setTips] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* 합성 이미지 프리뷰 */}
        {compositeUrl && (
          <div className="mx-auto max-h-[45dvh] flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compositeUrl}
              alt="recreeshot preview"
              className="max-h-[45dvh] w-auto object-contain"
              style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.15)" }}
            />
          </div>
        )}

        {/* 선택된 장소 (read-only) */}
        {selectedPlace ? (
          <div className="flex items-center gap-2 border border-brand/50 rounded-xl px-3 py-2.5 bg-brand/5">
            <MapPin className="size-4 text-brand shrink-0" />
            <span className="text-sm font-medium">{selectedPlace.nameEn ?? selectedPlace.nameKo}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-dashed border-border rounded-xl px-3 py-2.5">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">No location set — go back to add one</span>
          </div>
        )}

        {/* 선택된 태그 (read-only) */}
        {badgeOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badgeOptions.map((opt) => (
              <span
                key={opt.id}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: opt.colorHex2
                    ? `linear-gradient(${opt.gradientDir}, ${opt.colorHex}, ${opt.colorHex2} ${opt.gradientStop}%)`
                    : opt.colorHex,
                  color: opt.textColorHex,
                }}
              >
                {opt.name}
              </span>
            ))}
          </div>
        )}


        {/* 스토리 */}
        <div className="border border-border rounded-xl px-3 pt-3 pb-2">
          <textarea
            placeholder="Share the story behind this shot!"
            value={story}
            onChange={(e) => setStory(e.target.value.slice(0, 300))}
            rows={4}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{story.length}/300</p>
        </div>

        {/* 팁 */}
        <div className="border border-border rounded-xl px-3 pt-3 pb-2">
          <textarea
            placeholder="Tips (best time to visit, hidden tips...)"
            value={tips}
            onChange={(e) => setTips(e.target.value.slice(0, 300))}
            rows={3}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{tips.length}/300</p>
        </div>
      </div>

      {/* Share 버튼 */}
      <div className="px-4 py-3 shrink-0 space-y-2">
        {submitted && !selectedPlace && (
          <p className="text-xs text-center text-muted-foreground">
            Go back to the decoration step to add a location.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setSubmitted(true);
            if (!selectedPlace) return;
            onShare({ story, tips, showBadge: false });
          }}
          disabled={isSubmitting}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isSubmitting ? "Sharing..." : "Share"}
        </button>
      </div>
    </div>
  );
}
