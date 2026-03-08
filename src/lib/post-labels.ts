// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유

export const DEFAULT_COLOR = "#C6FD09";
export const DEFAULT_TEXT = "#000000";

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

export function labelBackground(label: ResolvedLabel): string {
  return label.colorHex2
    ? `linear-gradient(${label.gradientDir}, ${label.colorHex}, ${label.colorHex2} ${label.gradientStop}%)`
    : label.colorHex;
}
