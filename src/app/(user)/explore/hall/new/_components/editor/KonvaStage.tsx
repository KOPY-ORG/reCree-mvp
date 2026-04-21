"use client";

import React, { useEffect, useRef } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Text,
  Group,
  Transformer,
} from "react-konva";
import { coverRect } from "@/lib/canvas-utils";
import type Konva from "konva";
import type { EditorLayer, TemplateConfig } from "./editor-types";

// ── 캔버스 공간 기준 배지 치수 (px, 1080 기준) ─────────────────────────────────
const BADGE = { w: 300, h: 72, r: 36, fs: 36 } as const;
const LOC = { w: 360, h: 80, r: 40, fs: 34 } as const;
const SCORE = { w: 200, h: 120, r: 20, fsNum: 72, fsLabel: 26 } as const;
const STICKER_SIZE = 200; // 스티커 기본 크기 (정사각형)

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
  stickerImages: Record<string, HTMLImageElement>;
  onStageReady: (stage: Konva.Stage) => void;
  onLayerSelect: (id: string | null) => void;
  onLayerDelete: (id: string) => void;
  onLayerUpdate: (
    id: string,
    updates: { x: number; y: number; scale: number; rotation: number }
  ) => void;
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
  stickerImages,
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

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    let node: Konva.Node | null = e.target;
    for (let i = 0; i < 6; i++) {
      if (!node) break;
      const id = node.id();
      if (id && layers.some((l) => l.id === id)) return;
      node = node.getParent() as Konva.Node | null;
    }
    onLayerSelect(null);
  }

  // 공통 상호작용 props (Text / Group 모두 사용)
  function interactiveProps(layer: EditorLayer) {
    return {
      id: layer.id,
      x: layer.x * stageW,
      y: layer.y * stageH,
      scaleX: layer.scale,
      scaleY: layer.scale,
      rotation: layer.rotation,
      draggable: true,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        onLayerSelect(layer.id);
      },
      onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
        e.cancelBubble = true;
        onLayerSelect(layer.id);
      },
      onDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        onLayerDelete(layer.id);
      },
      onDblTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
        e.cancelBubble = true;
        onLayerDelete(layer.id);
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        onLayerUpdate(layer.id, {
          x: e.target.x() / stageW,
          y: e.target.y() / stageH,
          scale: e.target.scaleX(),
          rotation: e.target.rotation(),
        });
      },
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        onLayerUpdate(layer.id, {
          x: node.x() / stageW,
          y: node.y() / stageH,
          scale: node.scaleX(),
          rotation: node.rotation(),
        });
      },
    };
  }

  return (
    <Stage
      width={stageW}
      height={stageH}
      ref={stageRef}
      onClick={handleStageClick}
      onTap={handleStageClick}
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
                    const { sx, sy, sw, sh } = coverRect(
                      img.naturalWidth,
                      img.naturalHeight,
                      dW,
                      dH
                    );
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

      {/* 스티커 / 텍스트 레이어 */}
      <Layer name="stickers">
        {layers.map((layer) => {
          const ip = interactiveProps(layer);

          if (layer.type === "text") {
            return (
              <Text
                key={layer.id}
                {...ip}
                text={layer.text ?? ""}
                fontSize={Math.round((layer.fontSize ?? 80) * scale)}
                fill={layer.color ?? "#ffffff"}
              />
            );
          }

          if (layer.type === "label-badge") {
            const bw = BADGE.w * scale;
            const bh = BADGE.h * scale;
            const fs = BADGE.fs * scale;
            const colorHex = layer.badgeColorHex ?? "#e4e4e7";
            const colorHex2 = layer.badgeColorHex2 ?? null;
            const textColor = layer.badgeTextColorHex ?? "#000000";
            const gradStop = (layer.badgeGradientStop ?? 100) / 100;
            return (
              <Group key={layer.id} {...ip}>
                <Rect
                  width={bw}
                  height={bh}
                  cornerRadius={BADGE.r * scale}
                  {...(colorHex2
                    ? {
                        fillLinearGradientStartPoint: { x: 0, y: 0 },
                        fillLinearGradientEndPoint: { x: 0, y: bh },
                        fillLinearGradientColorStops: [0, colorHex, gradStop, colorHex2],
                      }
                    : { fill: colorHex })}
                />
                <Text
                  y={(bh - fs) / 2}
                  width={bw}
                  text={layer.badgeName ?? ""}
                  fontSize={fs}
                  fill={textColor}
                  align="center"
                  listening={false}
                />
              </Group>
            );
          }

          if (layer.type === "location-tag") {
            const lw = LOC.w * scale;
            const lh = LOC.h * scale;
            const fs = LOC.fs * scale;
            return (
              <Group key={layer.id} {...ip}>
                <Rect
                  width={lw}
                  height={lh}
                  cornerRadius={LOC.r * scale}
                  fill="#ffffff"
                />
                <Text
                  y={(lh - fs) / 2}
                  width={lw}
                  text={`📍 ${layer.placeName ?? ""}`}
                  fontSize={fs}
                  fill="#111111"
                  align="center"
                  listening={false}
                />
              </Group>
            );
          }

          if (layer.type === "match-score") {
            const sw = SCORE.w * scale;
            const sh = SCORE.h * scale;
            const fsNum = SCORE.fsNum * scale;
            const fsLabel = SCORE.fsLabel * scale;
            const score = layer.score ?? 0;
            return (
              <Group key={layer.id} {...ip}>
                <Rect
                  width={sw}
                  height={sh}
                  cornerRadius={SCORE.r * scale}
                  fill="#ffffff"
                />
                <Text
                  y={sh * 0.08}
                  width={sw}
                  text={`${score}%`}
                  fontSize={fsNum}
                  fontStyle="bold"
                  fill="#111111"
                  align="center"
                  listening={false}
                />
                <Text
                  y={sh * 0.08 + fsNum}
                  width={sw}
                  text="Match Score"
                  fontSize={fsLabel}
                  fill="#888888"
                  align="center"
                  listening={false}
                />
              </Group>
            );
          }

          if (layer.type === "sticker") {
            const img = stickerImages[layer.id];
            if (!img) return null;
            const sz = STICKER_SIZE * scale;
            const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
            const iw = sz;
            const ih = sz * ratio;
            return (
              <KonvaImage
                key={layer.id}
                {...ip}
                image={img}
                width={iw}
                height={ih}
              />
            );
          }

          return null;
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
