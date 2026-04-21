import type { TemplateConfig } from "./editor-types";

// 세로 꽉찬: 4:5 (1080×1350), 두 사진 위/아래 균등 분할
const VERTICAL_FULL: TemplateConfig = {
  id: "vertical-full",
  canvasWidth: 1080,
  canvasHeight: 1350,
  slots: [
    { x: 0, y: 0, width: 1080, height: 675 },
    { x: 0, y: 675, width: 1080, height: 675 },
  ],
  frame: null,
};

// 세로 프레임: 4:5 (1080×1350), 흰 프레임 + 레이블
// 프레임 padding=60, 사진 사이 gap=40, 레이블 영역 높이=60
const VFRAME_PADDING = 60;
const VFRAME_GAP = 40;
const VFRAME_LABEL = 60;
const VFRAME_PHOTO_W = 1080 - VFRAME_PADDING * 2;
const VFRAME_PHOTO_H =
  (1350 - VFRAME_PADDING * 2 - VFRAME_GAP - VFRAME_LABEL * 2) / 2;

const VERTICAL_FRAME: TemplateConfig = {
  id: "vertical-frame",
  canvasWidth: 1080,
  canvasHeight: 1350,
  slots: [
    {
      x: VFRAME_PADDING,
      y: VFRAME_PADDING,
      width: VFRAME_PHOTO_W,
      height: VFRAME_PHOTO_H,
    },
    {
      x: VFRAME_PADDING,
      y: VFRAME_PADDING + VFRAME_PHOTO_H + VFRAME_LABEL + VFRAME_GAP,
      width: VFRAME_PHOTO_W,
      height: VFRAME_PHOTO_H,
    },
  ],
  frame: {
    padding: VFRAME_PADDING,
    innerGap: VFRAME_GAP,
    labelHeight: VFRAME_LABEL,
    fontSize: 48,
    defaultLabels: ["Artist", "ME"],
  },
};

// 가로 꽉찬: 5:4 (1350×1080), 두 사진 좌/우 균등 분할
const HORIZONTAL_FULL: TemplateConfig = {
  id: "horizontal-full",
  canvasWidth: 1350,
  canvasHeight: 1080,
  slots: [
    { x: 0, y: 0, width: 675, height: 1080 },
    { x: 675, y: 0, width: 675, height: 1080 },
  ],
  frame: null,
};

// 가로 프레임: 5:4 (1350×1080), 흰 프레임 + 레이블
// 프레임 padding=60, 사진 사이 gap=40, 레이블 영역 높이=60
const HFRAME_PADDING = 60;
const HFRAME_GAP = 40;
const HFRAME_LABEL = 90;
const HFRAME_PHOTO_H = 1080 - HFRAME_PADDING * 2 - HFRAME_LABEL;
const HFRAME_PHOTO_W =
  (1350 - HFRAME_PADDING * 2 - HFRAME_GAP) / 2;

const HORIZONTAL_FRAME: TemplateConfig = {
  id: "horizontal-frame",
  canvasWidth: 1350,
  canvasHeight: 1080,
  slots: [
    {
      x: HFRAME_PADDING,
      y: HFRAME_PADDING,
      width: HFRAME_PHOTO_W,
      height: HFRAME_PHOTO_H,
    },
    {
      x: HFRAME_PADDING + HFRAME_PHOTO_W + HFRAME_GAP,
      y: HFRAME_PADDING,
      width: HFRAME_PHOTO_W,
      height: HFRAME_PHOTO_H,
    },
  ],
  frame: {
    padding: HFRAME_PADDING,
    innerGap: HFRAME_GAP,
    labelHeight: HFRAME_LABEL,
    fontSize: 48,
    defaultLabels: ["Artist", "ME"],
  },
};

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  "vertical-full": VERTICAL_FULL,
  "vertical-frame": VERTICAL_FRAME,
  "horizontal-full": HORIZONTAL_FULL,
  "horizontal-frame": HORIZONTAL_FRAME,
};

export const DEFAULT_TEMPLATE_ID = "vertical-full";

export function getTemplateConfig(id: string): TemplateConfig {
  return TEMPLATE_CONFIGS[id] ?? TEMPLATE_CONFIGS[DEFAULT_TEMPLATE_ID];
}
