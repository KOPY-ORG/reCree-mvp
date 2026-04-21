"use client";

import React, { useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from "react-konva";
import { coverRect } from "@/lib/canvas-utils";
import type Konva from "konva";
import type { EditorLayer, TemplateConfig } from "./editor-types";

interface Props {
  stageW: number;
  stageH: number;
  templateConfig: TemplateConfig;
  referenceImg: HTMLImageElement | null;
  shotImg: HTMLImageElement | null;
  frameColorHex: string;
  referenceLabel: string | null;
  shotLabel: string | null;
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onStageReady: (stage: Konva.Stage) => void;
  onLayerSelect: (id: string | null) => void;
  onLayerDelete: (id: string) => void;
  onLayerUpdate: (id: string, updates: { x: number; y: number; scale: number; rotation: number }) => void;
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
  layers,
  selectedLayerId,
  onStageReady,
  onLayerSelect,
  onLayerDelete,
  onLayerUpdate,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (stageRef.current) onStageReady(stageRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Transformer를 선택된 레이어에 붙이기
  useEffect(() => {
    const tr = trRef.current;
    if (!tr || !stageRef.current) return;
    if (selectedLayerId) {
      const node = stageRef.current.findOne(`#${selectedLayerId}`);
      if (node) {
        tr.nodes([node as Konva.Node]);
        tr.getLayer()?.batchDraw();
      }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedLayerId, layers]);

  const scale = stageW / templateConfig.canvasWidth;
  const { frame, slots } = templateConfig;

  const [refLabel, meLabel] = frame
    ? [
        referenceLabel ?? frame.defaultLabels[0],
        shotLabel ?? frame.defaultLabels[1],
      ]
    : [null, null];

  function handleStagePointerDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const clickedId = e.target.id();
    if (!clickedId || !layers.some((l) => l.id === clickedId)) {
      onLayerSelect(null);
    }
  }

  return (
    <Stage
      width={stageW}
      height={stageH}
      ref={stageRef}
      onClick={handleStagePointerDown}
      onTap={handleStagePointerDown}
    >
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

      {/* 스티커/텍스트 레이어 */}
      <Layer name="stickers">
        {layers.map((layer) => {
          if (layer.type !== "text") return null;
          return (
            <Text
              key={layer.id}
              id={layer.id}
              x={layer.x * stageW}
              y={layer.y * stageH}
              text={layer.text ?? ""}
              fontSize={Math.round((layer.fontSize ?? 80) * scale)}
              fill={layer.color ?? "#ffffff"}
              scaleX={layer.scale}
              scaleY={layer.scale}
              rotation={layer.rotation}
              draggable
              onClick={() => onLayerSelect(layer.id)}
              onTap={() => onLayerSelect(layer.id)}
              onDblClick={() => onLayerDelete(layer.id)}
              onDblTap={() => onLayerDelete(layer.id)}
              onDragEnd={(e) => {
                onLayerUpdate(layer.id, {
                  x: e.target.x() / stageW,
                  y: e.target.y() / stageH,
                  scale: e.target.scaleX(),
                  rotation: e.target.rotation(),
                });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                onLayerUpdate(layer.id, {
                  x: node.x() / stageW,
                  y: node.y() / stageH,
                  scale: node.scaleX(),
                  rotation: node.rotation(),
                });
              }}
            />
          );
        })}
        <Transformer
          ref={trRef}
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
