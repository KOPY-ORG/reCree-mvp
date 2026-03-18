// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유
import type React from "react";

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
