// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유
import type React from "react";

/** K-MEDIA 태그 그룹 PK — 변경 시 DB TagGroupConfig.group과 동기화 */
export const K_MEDIA_GROUP = "K_MEDIA";

/** 라벨 렌더링 그룹 우선순위: 토픽(0) → K-MEDIA(1) → 나머지(2) */
export const labelGroupOrder = (group: string): number =>
  group === "TOPIC" ? 0 : group === K_MEDIA_GROUP ? 1 : 2;

export const DEFAULT_COLOR = "#e4e4e7";
export const DEFAULT_TEXT = "#000000";

// ── 어드민 토픽 flat 리스트 effective color 계산 ──────────────────────────────
// level 순 정렬된 flat 배열을 받아 각 토픽의 effective color를 계산해 반환.
// (colorHex === null → 부모 색상 상속)

export type EffectiveColorInfo = {
  hex: string;
  hex2: string | null;
  dir: string;
  stop: number;
  textHex: string;
};

export function computeTopicEffectiveColors(
  topics: {
    id: string;
    parentId: string | null;
    colorHex: string | null;
    colorHex2: string | null;
    gradientDir: string;
    gradientStop: number;
    textColorHex: string | null;
  }[]
): Map<string, EffectiveColorInfo> {
  const map = new Map<string, EffectiveColorInfo>();
  for (const t of topics) {
    const parent = t.parentId ? map.get(t.parentId) : undefined;
    const inherits = t.colorHex === null;
    const hex = t.colorHex ?? parent?.hex ?? DEFAULT_COLOR;
    const hex2 = inherits ? (parent?.hex2 ?? null) : t.colorHex2;
    const dir = inherits ? (parent?.dir ?? "to bottom") : t.gradientDir;
    const stop = inherits ? (parent?.stop ?? 150) : t.gradientStop;
    const textHex = t.textColorHex ?? parent?.textHex ?? DEFAULT_TEXT;
    map.set(t.id, { hex, hex2, dir, stop, textHex });
  }
  return map;
}

export type ColorNode = {
  colorHex?: string | null;
  colorHex2?: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex?: string | null;
  parent?: ColorNode | null;
};

export function resolveTopicColors(node: ColorNode): {
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
} {
  if (node.colorHex) {
    return {
      colorHex: node.colorHex,
      colorHex2: node.colorHex2 ?? null,
      gradientDir: node.gradientDir ?? "to bottom",
      gradientStop: node.gradientStop ?? 150,
      textColorHex: node.textColorHex ?? DEFAULT_TEXT,
    };
  }
  if (node.parent) return resolveTopicColors(node.parent);
  return {
    colorHex: DEFAULT_COLOR,
    colorHex2: null,
    gradientDir: "to bottom",
    gradientStop: 150,
    textColorHex: DEFAULT_TEXT,
  };
}

export type TagGroupColorMap = Map<
  string,
  {
    displayLabel: string | null;
    colorHex: string;
    colorHex2: string | null;
    gradientDir: string;
    gradientStop: number;
    textColorHex: string;
  }
>;

export type ResolvedLabel = {
  text: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  slug?: string;
};

export function resolveTagColors(
  tag: { colorHex?: string | null; colorHex2?: string | null; textColorHex?: string | null },
  gc: { colorHex: string; colorHex2: string | null; gradientDir: string; gradientStop: number; textColorHex: string } | undefined
): Omit<ResolvedLabel, "text"> {
  return {
    colorHex: tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
    colorHex2: tag.colorHex ? (tag.colorHex2 ?? null) : (gc?.colorHex2 ?? null),
    gradientDir: gc?.gradientDir ?? "to bottom",
    gradientStop: gc?.gradientStop ?? 150,
    textColorHex: tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
  };
}

/** 동적 컬러 뱃지의 선택 상태 ring (box-shadow 기반) */
export function badgeRingStyle(color: string | null, active: boolean): React.CSSProperties {
  if (!active || !color) return {};
  return { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${color}` };
}

export function labelBackground(label: ResolvedLabel): string {
  return label.colorHex2
    ? `linear-gradient(${label.gradientDir}, ${label.colorHex}, ${label.colorHex2} ${label.gradientStop}%)`
    : label.colorHex;
}

// ── 라벨 슬롯 선택 공통 타입 ──────────────────────────────────────────────────

export type LabelSlot = {
  group: string;
  name: string;
  displayLabel: string | null;
  colors: Omit<ResolvedLabel, "text" | "slug">;
  slug?: string;
};

/** 슬롯 배열을 ResolvedLabel[]로 변환 (정렬 + displayLabel 결정 포함) */
function finalizeSlots(selected: LabelSlot[]): ResolvedLabel[] {
  selected.sort((a, b) => labelGroupOrder(a.group) - labelGroupOrder(b.group));
  return selected.map((slot) => {
    const hasOtherGroup = selected.some((s) => s.group !== slot.group);
    const text = slot.displayLabel && hasOtherGroup ? slot.displayLabel : slot.name;
    return { text, ...slot.colors, ...(slot.slug ? { slug: slot.slug } : {}) };
  });
}

/**
 * home variant — 토픽 1 + non-K_MEDIA 태그 1 (최대 2개)
 * 슬롯이 부족하면 상호 보완
 */
export function selectHomeLabels(
  topicSlots: LabelSlot[],
  otherSlots: LabelSlot[],
): ResolvedLabel[] {
  const selected: LabelSlot[] = [];
  let topicUsed = 0, otherUsed = 0;
  if (topicUsed < topicSlots.length) selected.push(topicSlots[topicUsed++]);
  else if (otherUsed < otherSlots.length) selected.push(otherSlots[otherUsed++]);
  if (otherUsed < otherSlots.length) selected.push(otherSlots[otherUsed++]);
  else if (topicUsed < topicSlots.length) selected.push(topicSlots[topicUsed++]);
  return finalizeSlots(selected);
}

/**
 * list variant — 토픽 1 + K_MEDIA 1 + non-K_MEDIA 1, 최대 3개
 * 빈 슬롯은 남은 항목으로 보충
 */
export function selectListLabels(
  topicSlots: LabelSlot[],
  kmediaSlots: LabelSlot[],
  otherSlots: LabelSlot[],
): ResolvedLabel[] {
  const selected: LabelSlot[] = [];
  let topicUsed = 0, kmediaUsed = 0, otherUsed = 0;
  if (topicUsed < topicSlots.length)   selected.push(topicSlots[topicUsed++]);
  if (kmediaUsed < kmediaSlots.length) selected.push(kmediaSlots[kmediaUsed++]);
  if (otherUsed < otherSlots.length)   selected.push(otherSlots[otherUsed++]);
  if (selected.length < 3) {
    const remaining = [
      ...topicSlots.slice(topicUsed),
      ...kmediaSlots.slice(kmediaUsed),
      ...otherSlots.slice(otherUsed),
    ];
    for (const slot of remaining) {
      if (selected.length >= 3) break;
      selected.push(slot);
    }
  }
  return finalizeSlots(selected);
}
