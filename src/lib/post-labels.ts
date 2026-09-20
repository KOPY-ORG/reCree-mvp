// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유
import type React from "react";
import type { PlaceCategory } from "@prisma/client";

/** K-MEDIA 태그 그룹 PK — 변경 시 DB TagGroupConfig.group과 동기화 */
export const K_MEDIA_GROUP = "MEDIA";

/**
 * 팬 맥락 태그 — SPOT 그룹 10개 중 "왜 팬이 이 장소에 가는가"를 말하는 5개.
 * 나머지 5개(nature·attraction·heritage·landmark·shopping)는 장소의 성격이라
 * 이제 장소 타입이 맡는다.
 *
 * MEDIA 는 그룹 전체가 팬 맥락이라 K_MEDIA_GROUP 으로 식별한다 — 여기 넣지 않는다.
 * group 이 아니라 slug 로 거르는 이유는 SPOT 이 한 그룹 안에서 갈리기 때문이고,
 * name 이 아니라 slug 인 이유는 이름은 어드민에서 바뀌기 때문이다.
 */
export const FAN_CONTEXT_TAG_SLUGS = [
  "filming-location",
  "photo-spot",
  "fan-spot",
  "local",
  "vintageretro",
] as const;

/**
 * 장소 타입 배지 색. 태그와 달리 PlaceType 에는 색 칸이 없어 카테고리별로 코드가 정한다.
 *
 * 태그 그룹 색(TagGroupConfig)과 겹치지 않아야 카드에서 둘이 구분된다 —
 * K-FOOD(#FFE592→#ffae00)·K-SPOT(#ffed94→#ffee33)이 이미 노랑 계열이라
 * 먹는 것과 명소는 그 둘을 그대로 잇고, 나머지는 비는 색을 쓴다.
 */
export const PLACE_CATEGORY_COLORS: Record<PlaceCategory, Omit<ResolvedLabel, "text" | "slug">> = {
  EAT:         { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  CAFE:        { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  BAR:         { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  ATTRACTIONS: { colorHex: "#ffed94", colorHex2: "#ffee33", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  K_CULTURE:   { colorHex: "#B8D4FF", colorHex2: "#6FA8FF", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  EXPERIENCE:  { colorHex: "#ff8f66", colorHex2: "#fb5209", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#FFFFFF" },
  SHOP:        { colorHex: "#88fbe2", colorHex2: "#00ffc8", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  STAY:        { colorHex: "#E2D6FF", colorHex2: "#BFA6FF", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  OTHER:       { colorHex: "#E4E4E7", colorHex2: null,      gradientDir: "to bottom", gradientStop: 150, textColorHex: "#000000" },
};

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
  /** 토픽 계층 레벨 — shop selector의 멤버 우선 선택용. 없으면 배열 순서 폴백 */
  level?: number;
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

/**
 * shop variant — 멤버 우선 토픽 1 + shop 카테고리 태그 1, 최대 2개.
 * - 토픽: level 최댓값(=멤버)을 우선 선택. level 동률이면 배열 순서(displayOrder) 앞선 것.
 *         level이 전부 undefined면 배열 첫 번째로 폴백(방어 코드).
 * - 태그: group이 shopGroups(BEAUTY/ITEM)에 포함된 것만 후보 → 배열 순서 첫 번째.
 *         없으면 태그 슬롯 없음(다른 그룹으로 대체하지 않음).
 * shopGroups는 인자로 받는다 — lib → app(shop/_constants) 역방향 의존을 피하기 위함.
 */
export function selectShopLabels(
  topicSlots: LabelSlot[],
  tagSlots: LabelSlot[],
  shopGroups: readonly string[],
): ResolvedLabel[] {
  const selected: LabelSlot[] = [];
  if (topicSlots.length > 0) {
    const member = topicSlots.reduce((best, s) =>
      (s.level ?? -Infinity) > (best.level ?? -Infinity) ? s : best,
    );
    selected.push(member);
  }
  const shopTag = tagSlots.find((s) => shopGroups.includes(s.group));
  if (shopTag) selected.push(shopTag);
  return finalizeSlots(selected);
}
