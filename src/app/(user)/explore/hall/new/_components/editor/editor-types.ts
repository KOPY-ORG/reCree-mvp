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
  // type별 추가 데이터
  text?: string;        // type=text
  fontSize?: number;    // type=text (px, 1080 기준)
  color?: string;       // type=text
  stickerId?: string;   // type=sticker
  stickerUrl?: string;  // type=sticker (R2 URL)
  topicId?: string;     // type=label-badge
  tagId?: string;       // type=label-badge
  score?: number;       // type=match-score
  placeName?: string;   // type=location-tag
}

export interface TemplateConfig {
  id: TemplateId;
  // 완성 캔버스 크기 (export 기준)
  canvasWidth: number;
  canvasHeight: number;
  // 사진 슬롯 (export 기준 px)
  slots: [PhotoSlot, PhotoSlot];
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
