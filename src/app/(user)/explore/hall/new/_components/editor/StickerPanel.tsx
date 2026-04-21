"use client";

import { useEffect, useState } from "react";
import { MapPin, Star, Target, Loader2 } from "lucide-react";
import { getActiveStickers } from "@/lib/actions/sticker-actions";
import { previewMatchScore } from "@/app/(user)/_actions/recreeshot-actions";
import type { EditorLayer, StickerBadgeOption } from "./editor-types";

// 캔버스 기준 배지 치수 (KonvaStage와 동일)
const BADGE_W = 300;
const BADGE_H = 72;
const LOC_W = 360;
const LOC_H = 80;
const SCORE_W = 200;
const SCORE_H = 120;

interface ActiveSticker {
  id: string;
  name: string;
  imageUrl: string;
  mimeType: string;
}

interface Props {
  canvasWidth: number;
  canvasHeight: number;
  placeName: string | null;
  badgeOptions: StickerBadgeOption[];
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  onAddLayer: (layer: Omit<EditorLayer, "id">) => void;
}

export function StickerPanel({
  canvasWidth,
  canvasHeight,
  placeName,
  badgeOptions,
  uploadedReferenceUrl,
  uploadedShotUrl,
  onAddLayer,
}: Props) {
  const [stickers, setStickers] = useState<ActiveSticker[]>([]);
  const [loadingScore, setLoadingScore] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    getActiveStickers().then(setStickers).catch(() => {});
  }, []);

  function centerPos(w: number, h: number) {
    return {
      x: 0.5 - w / 2 / canvasWidth,
      y: 0.5 - h / 2 / canvasHeight,
    };
  }

  function addLocationTag() {
    if (!placeName) return;
    const { x, y } = centerPos(LOC_W, LOC_H);
    onAddLayer({ type: "location-tag", x, y, scale: 1, rotation: 0, placeName });
  }

  function addBadge(opt: StickerBadgeOption) {
    const { x, y } = centerPos(BADGE_W, BADGE_H);
    onAddLayer({
      type: "label-badge",
      x,
      y,
      scale: 1,
      rotation: 0,
      topicId: opt.type === "topic" ? opt.id : undefined,
      tagId: opt.type === "tag" ? opt.id : undefined,
      badgeName: opt.name,
      badgeColorHex: opt.colorHex,
      badgeColorHex2: opt.colorHex2,
      badgeGradientDir: opt.gradientDir,
      badgeGradientStop: opt.gradientStop,
      badgeTextColorHex: opt.textColorHex,
    });
  }

  async function handleGetScore() {
    if (!uploadedReferenceUrl || !uploadedShotUrl) return;
    setLoadingScore(true);
    setScoreError(null);
    try {
      const result = await previewMatchScore(uploadedReferenceUrl, uploadedShotUrl);
      if ("error" in result) {
        setScoreError("Score calculation failed.");
      } else {
        setScoreResult(result.score);
      }
    } finally {
      setLoadingScore(false);
    }
  }

  function addMatchScore() {
    if (scoreResult === null) return;
    const { x, y } = centerPos(SCORE_W, SCORE_H);
    onAddLayer({ type: "match-score", x, y, scale: 1, rotation: 0, score: scoreResult });
  }

  function addSticker(s: ActiveSticker) {
    onAddLayer({
      type: "sticker",
      x: 0.5 - 200 / 2 / canvasWidth,
      y: 0.5 - 200 / 2 / canvasHeight,
      scale: 1,
      rotation: 0,
      stickerId: s.id,
      stickerUrl: s.imageUrl,
    });
  }

  return (
    <div className="space-y-4 py-1">
      {/* 특수 스티커 */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Special</p>
        <div className="flex flex-wrap gap-2">
          {/* 장소 태그 */}
          <button
            type="button"
            disabled={!placeName}
            onClick={addLocationTag}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium disabled:opacity-40"
          >
            <MapPin className="size-3.5" />
            {placeName ?? "No location"}
          </button>

          {/* 배지 옵션들 */}
          {badgeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => addBadge(opt)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: opt.colorHex2
                  ? `linear-gradient(${opt.gradientDir}, ${opt.colorHex}, ${opt.colorHex2} ${opt.gradientStop}%)`
                  : opt.colorHex,
                color: opt.textColorHex,
              }}
            >
              {opt.name}
            </button>
          ))}

          {/* 매치 스코어 */}
          <div className="flex items-center gap-1.5">
            {scoreResult !== null ? (
              <button
                type="button"
                onClick={addMatchScore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand text-xs font-semibold text-brand"
              >
                <Target className="size-3.5" />
                {scoreResult}% — Add
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGetScore}
                disabled={loadingScore || !uploadedReferenceUrl || !uploadedShotUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium disabled:opacity-40"
              >
                {loadingScore ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Star className="size-3.5" />
                )}
                Match Score
              </button>
            )}
            {scoreError && (
              <span className="text-[10px] text-red-500">{scoreError}</span>
            )}
          </div>
        </div>
      </div>

      {/* 기본 스티커 */}
      {stickers.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Stickers</p>
          <div className="flex flex-wrap gap-2">
            {stickers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addSticker(s)}
                className="size-12 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden"
                title={s.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imageUrl}
                  alt={s.name}
                  className="size-10 object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {stickers.length === 0 && badgeOptions.length === 0 && !placeName && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No stickers available yet.
        </p>
      )}
    </div>
  );
}
