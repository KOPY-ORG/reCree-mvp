export type TemplateModeId = "side-by-side" | "4-cuts" | "solo";

export type StickerStyle = "pill" | "stamp" | "ribbon" | "ticket";

export type TemplateId =
  | "vertical-full"
  | "vertical-frame"
  | "horizontal-full"
  | "horizontal-frame";

export type EditorLayerType =
  | "text"
  | "location-tag"
  | "label-badge"
  | "match-score"
  | "sticker";

export interface EditorLayer {
  id: string;
  type: EditorLayerType;
  // 0~1 비율값 (캔버스 크기에 독립적)
  x: number;
  y: number;
  scale: number;
  rotation: number;
  // type=text
  text?: string;
  fontSize?: number;    // px, 1080 기준
  color?: string;
  // type=sticker
  stickerId?: string;
  stickerUrl?: string;  // R2 URL
  // type=label-badge
  topicId?: string;
  tagId?: string;
  // type=match-score
  score?: number;
  // type=location-tag
  placeName?: string;
  // label-badge / location-tag 렌더링용 색상 정보 (저장 시점에 복사)
  badgeName?: string;
  badgeColorHex?: string;
  badgeColorHex2?: string | null;
  badgeGradientDir?: string;
  badgeGradientStop?: number;
  badgeTextColorHex?: string;
}

// 스티커 패널에서 배지 옵션으로 표시할 토픽/태그 색상 정보
export interface StickerBadgeOption {
  id: string;
  name: string;
  type: "topic" | "tag";
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
}

export interface TemplateConfig {
  id: string;
  // 완성 캔버스 크기 (export 기준)
  canvasWidth: number;
  canvasHeight: number;
  // 사진 슬롯 (export 기준 px) — 모드에 따라 1개(solo), 2개(side-by-side), 4개(4-cuts)
  slots: PhotoSlot[];
  // 프레임 설정 (null = 꽉찬 버전)
  frame: FrameConfig | null;
}

export interface PhotoSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameConfig {
  padding: number;       // 프레임 바깥 여백 (px)
  innerGap: number;      // 두 사진 사이 간격 (px)
  labelHeight: number;   // 사진 아래 텍스트 영역 높이 (px)
  fontSize: number;      // 레이블 폰트 크기 (px)
  defaultLabels: [string, string]; // [원본 레이블, 재현 레이블]
}

// 에디터 UI 상태 (Konva 좌표계 — display 크기 기준)
export interface EditorState {
  templateId: TemplateId;
  frameColorHex: string;
  referenceLabel: string | null; // null = 삭제됨
  shotLabel: string | null;      // null = 삭제됨
  layers: EditorLayer[];
  selectedLayerId: string | null;
}
