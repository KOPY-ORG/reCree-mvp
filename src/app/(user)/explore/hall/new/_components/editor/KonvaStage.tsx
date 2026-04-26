"use client";

import React, { useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group } from "react-konva";
import { coverRect } from "@/lib/canvas-utils";
import type Konva from "konva";
import type { TemplateConfig, StickerStyle } from "./editor-types";
import { isDark } from "./ScoreSheet";

interface Props {
  stageW: number;
  stageH: number;
  templateConfig: TemplateConfig;
  referenceImg: HTMLImageElement | null;
  shotImg: HTMLImageElement | null;
  frameColorHex: string;
  referenceLabel: string;
  shotLabel: string;
  labelColor: string;
  matchScore?: number | null;
  showMatchScore?: boolean;
  stickerStyle?: StickerStyle;
  stickerColor?: string;
  matchScorePos?: { x: number; y: number };
  onMatchScoreDragEnd?: (pos: { x: number; y: number }) => void;
  onStageReady: (stage: Konva.Stage) => void;
}

export default function KonvaStage({
  stageW,
  stageH,
  templateConfig,
  referenceImg,
  shotImg,
  frameColorHex,
  referenceLabel,
  shotLabel,
  labelColor,
  matchScore,
  showMatchScore,
  stickerStyle = "pill",
  stickerColor = "#C8FF09",
  matchScorePos = { x: 60, y: 60 },
  onMatchScoreDragEnd,
  onStageReady,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    if (stageRef.current) onStageReady(stageRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = stageW / templateConfig.canvasWidth;
  const { frame, slots } = templateConfig;
  const [refLabel, meLabel] = [referenceLabel, shotLabel];

  return (
    <Stage width={stageW} height={stageH} ref={stageRef}>
      <Layer>
        {frame && (
          <Rect x={0} y={0} width={stageW} height={stageH} fill={frameColorHex || "#ffffff"} />
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
                  fill={labelColor} listening={false}
                />
              )}
            </React.Fragment>
          );
        })}
        {/* Match Score 배지 */}
        {showMatchScore && matchScore != null && (
          <ScoreBadge
            score={matchScore}
            style={stickerStyle}
            color={stickerColor}
            posX={matchScorePos.x * scale}
            posY={matchScorePos.y * scale}
            scale={scale}
            onDragEnd={(x, y) => onMatchScoreDragEnd?.({ x: x / scale, y: y / scale })}
          />
        )}
      </Layer>
    </Stage>
  );
}

// ── ScoreBadge (Konva) ────────────────────────────────────────────────────────

function s(v: number, scale: number) { return Math.round(v * scale); }

function ScoreBadge({ score, style, color, posX, posY, scale, onDragEnd }: {
  score: number; style: StickerStyle; color: string;
  posX: number; posY: number; scale: number;
  onDragEnd: (x: number, y: number) => void;
}) {
  const pct = Math.round(score);
  const textColor = isDark(color) ? "#ffffff" : "#000000";
  const shadow = { shadowColor: "rgba(0,0,0,0.3)", shadowBlur: s(12, scale), shadowOffsetY: s(3, scale) };

  const dragProps = {
    draggable: true,
    onDragEnd: (e: { target: { x: () => number; y: () => number } }) => onDragEnd(e.target.x(), e.target.y()),
  };

  if (style === "pill") {
    const bW = s(400, scale), bH = s(120, scale);
    const pctFs = s(68, scale), matchFs = s(28, scale);
    return (
      <Group x={posX} y={posY} {...dragProps}>
        <Rect width={bW} height={bH} fill={color} cornerRadius={s(60, scale)} {...shadow} />
        <Text text={`${pct}%`} fontStyle="bold" fontSize={pctFs} fill={textColor}
          x={s(24, scale)} y={Math.round((bH - pctFs) / 2)} width={s(190, scale)} />
        <Text text="MATCH" fontSize={matchFs} fill={textColor} fontStyle="bold"
          x={s(212, scale)} y={Math.round((bH - matchFs) / 2)} width={s(164, scale)} />
      </Group>
    );
  }

  if (style === "stamp") {
    const r = s(130, scale);
    const numFs = s(86, scale), matchFs = s(24, scale);
    const diameter = r * 2;
    return (
      <Group x={posX} y={posY} {...dragProps}>
        <Rect width={diameter} height={diameter} cornerRadius={r} fill={color} {...shadow} />
        <Rect x={s(16, scale)} y={s(16, scale)}
          width={diameter - s(32, scale)} height={diameter - s(32, scale)}
          cornerRadius={r - s(16, scale)}
          stroke={textColor} strokeWidth={s(3, scale)} dash={[s(6, scale), s(5, scale)]}
        />
        <Text text={`${pct}`} fontStyle="bold" fontSize={numFs} fill={textColor}
          width={diameter} y={Math.round(r - numFs * 0.6)} align="center" />
        <Text text="MATCH" fontSize={matchFs} fill={textColor} fontStyle="bold"
          width={diameter} y={Math.round(r + numFs * 0.38)} align="center" />
      </Group>
    );
  }

  if (style === "ribbon") {
    const bW = s(500, scale), bH = s(150, scale);
    const labelFs = s(30, scale), numFs = s(88, scale);
    return (
      <Group x={posX} y={posY} {...dragProps}>
        <Rect width={bW} height={bH} fill="#111111" cornerRadius={s(18, scale)} {...shadow} />
        <Text text="POSE" fontStyle="bold" fontSize={labelFs} fill="#ffffff"
          x={s(24, scale)} y={Math.round(bH / 2 - labelFs - s(4, scale))} />
        <Text text="MATCH" fontStyle="bold" fontSize={labelFs} fill="#ffffff"
          x={s(24, scale)} y={Math.round(bH / 2 + s(4, scale))} />
        <Text text={`${pct}%`} fontStyle="bold" fontSize={numFs} fill={color}
          x={s(180, scale)} y={Math.round((bH - numFs) / 2)} width={s(300, scale)} align="right" />
      </Group>
    );
  }

  // ticket
  const bW = s(340, scale), bH = s(230, scale);
  const headerFs = s(22, scale), numFs = s(100, scale), starFs = s(30, scale);
  const stars = "★".repeat(Math.min(5, Math.round(pct / 20)));
  return (
    <Group x={posX} y={posY} {...dragProps}>
      <Rect width={bW} height={bH} fill="#F5F3EE" cornerRadius={s(18, scale)}
        stroke="#E0DDD5" strokeWidth={s(2, scale)} {...shadow} />
      <Text text="N° MATCH" fontSize={headerFs} fill="#999999"
        width={bW} y={s(20, scale)} align="center" />
      <Text text={`${pct}%`} fontStyle="bold" fontSize={numFs} fill={color}
        width={bW} y={Math.round(s(20, scale) + headerFs + s(6, scale))} align="center" />
      <Text text={stars} fontSize={starFs} fill={color}
        width={bW} y={Math.round(bH - starFs - s(20, scale))} align="center" />
    </Group>
  );
}
