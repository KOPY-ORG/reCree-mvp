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
  referenceLabel: string;
  shotLabel: string;
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
      </Layer>
    </Stage>
  );
}
