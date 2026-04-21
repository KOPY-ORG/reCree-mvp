"use client";

import React, { useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text } from "react-konva";
import { coverRect } from "@/lib/canvas-utils";
import type Konva from "konva";
import type { TemplateConfig } from "./editor-types";

interface Props {
  stageW: number;
  stageH: number;
  templateConfig: TemplateConfig;
  referenceImg: HTMLImageElement | null;
  shotImg: HTMLImageElement | null;
  frameColorHex: string;
  referenceLabel: string | null;
  shotLabel: string | null;
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
  onStageReady,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    if (stageRef.current) onStageReady(stageRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = stageW / templateConfig.canvasWidth;
  const { frame, slots } = templateConfig;

  const [refLabel, meLabel] = frame
    ? [
        referenceLabel ?? frame.defaultLabels[0],
        shotLabel ?? frame.defaultLabels[1],
      ]
    : [null, null];

  return (
    <Stage width={stageW} height={stageH} ref={stageRef}>
      <Layer>
        {/* 프레임 배경 */}
        {frame && (
          <Rect
            x={0}
            y={0}
            width={stageW}
            height={stageH}
            fill={frameColorHex || "#ffffff"}
          />
        )}

        {/* 슬롯 사진 + 레이블 */}
        {slots.map((slot, i) => {
          const img = i === 0 ? referenceImg : shotImg;
          const dX = slot.x * scale;
          const dY = slot.y * scale;
          const dW = slot.width * scale;
          const dH = slot.height * scale;

          return (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={i}>
              {img ? (
                <KonvaImage
                  x={dX}
                  y={dY}
                  width={dW}
                  height={dH}
                  image={img}
                  crop={(() => {
                    const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, dW, dH);
                    return { x: sx, y: sy, width: sw, height: sh };
                  })()}
                />
              ) : (
                <Rect
                  x={dX}
                  y={dY}
                  width={dW}
                  height={dH}
                  fill={i === 0 ? "#d4f986" : "#c8ebf5"}
                />
              )}

              {frame && (
                <Text
                  x={dX}
                  y={dY + dH + Math.round(frame.labelHeight * scale * 0.4)}
                  width={dW}
                  text={(i === 0 ? refLabel : meLabel) ?? ""}
                  align="center"
                  fontSize={Math.round(frame.fontSize * scale)}
                  fill="#000000"
                  listening={false}
                />
              )}
            </React.Fragment>
          );
        })}

      </Layer>

      {/* 스티커 레이어 — Phase 5에서 채워짐 */}
      <Layer name="stickers" />
    </Stage>
  );
}
