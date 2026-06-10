"use client";

import React, { useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group } from "react-konva";
import { coverRect } from "@/lib/canvas-utils";
import type Konva from "konva";
import type { TemplateConfig } from "./editor-types";

interface Props {
  stageW: number;
  stageH: number;
  templateConfig: TemplateConfig;
  referenceImg: HTMLImageElement | null;
  shotImg: HTMLImageElement | null;
  referenceLabel: string;
  shotLabel: string;
  matchScore?: number | null;
  showMatchScore?: boolean;
  onStageReady: (stage: Konva.Stage) => void;
}

export default function KonvaStage({
  stageW,
  stageH,
  templateConfig,
  referenceImg,
  shotImg,
  referenceLabel,
  shotLabel,
  matchScore,
  showMatchScore,
  onStageReady,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    if (stageRef.current) onStageReady(stageRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = stageW / templateConfig.canvasWidth;
  const { frame, slots } = templateConfig;
  const [refLabel, meLabel] = [referenceLabel, shotLabel];

  const refSlot = slots[0];
  const stampR = Math.round(130 * scale);
  const stampPad = Math.round(16 * scale);
  const badgePosX = Math.round((refSlot.x + refSlot.width) * scale) - 2 * stampR - stampPad;
  const badgePosY = Math.round(refSlot.y * scale) + stampPad;

  return (
    <Stage width={stageW} height={stageH} ref={stageRef}>
      <Layer>
        {frame && (
          <Rect x={0} y={0} width={stageW} height={stageH} fill="#ffffff" />
        )}

        {slots.map((slot, i) => {
          const img = i === 0 ? referenceImg : shotImg;
          const dX = Math.round(slot.x * scale);
          const dY = Math.round(slot.y * scale);
          const dW = Math.round((slot.x + slot.width) * scale) - dX;
          const dH = Math.round((slot.y + slot.height) * scale) - dY;

          return (
            <React.Fragment key={i}>
              {img ? (
                <KonvaImage
                  x={dX} y={dY} width={dW} height={dH} image={img}
                  crop={(() => {
                    const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, dW, dH);
                    return { x: sx, y: sy, width: sw, height: sh };
                  })()}
                />
              ) : (
                <Rect x={dX} y={dY} width={dW} height={dH} fill={i === 0 ? "#d4f986" : "#c8ebf5"} />
              )}
              {frame && (
                <Text
                  x={dX} y={dY + dH + Math.round(frame.labelHeight * scale * 0.4)}
                  width={dW} text={i === 0 ? refLabel : meLabel}
                  align="center" fontSize={Math.round(frame.fontSize * scale)}
                  fill="#000000" listening={false}
                />
              )}
            </React.Fragment>
          );
        })}
        {/* Match Score 배지 */}
        {showMatchScore && matchScore != null && (
          <ScoreBadge score={matchScore} posX={badgePosX} posY={badgePosY} scale={scale} />
        )}
      </Layer>
    </Stage>
  );
}

// ── ScoreBadge (Konva, STAMP 고정) ────────────────────────────────────────────

function s(v: number, scale: number) { return Math.round(v * scale); }

const BADGE_COLOR = "#C8FF09";

function ScoreBadge({ score, posX, posY, scale }: {
  score: number; posX: number; posY: number; scale: number;
}) {
  const pct = Math.round(score);
  const r = s(130, scale);
  const numFs = s(86, scale), matchFs = s(24, scale);
  const diameter = r * 2;
  const shadow = { shadowColor: "rgba(0,0,0,0.3)", shadowBlur: s(12, scale), shadowOffsetY: s(3, scale) };
  return (
    <Group x={posX} y={posY}>
      <Rect width={diameter} height={diameter} cornerRadius={r} fill={BADGE_COLOR} {...shadow} />
      <Rect x={s(16, scale)} y={s(16, scale)}
        width={diameter - s(32, scale)} height={diameter - s(32, scale)}
        cornerRadius={r - s(16, scale)}
        stroke="#000000" strokeWidth={s(3, scale)} dash={[s(6, scale), s(5, scale)]}
      />
      <Text text={`${pct}`} fontStyle="bold" fontSize={numFs} fill="#000000"
        width={diameter} y={Math.round(r - numFs * 0.6)} align="center" />
      <Text text="MATCH" fontSize={matchFs} fill="#000000" fontStyle="bold"
        width={diameter} y={Math.round(r + numFs * 0.38)} align="center" />
    </Group>
  );
}
