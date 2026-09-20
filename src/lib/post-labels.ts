// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유
import type React from "react";
import type { PlaceCategory } from "@prisma/client";
import { primaryPlaceType, type PlaceTypeInfo, type PlaceTypeLink } from "@/lib/place-types";

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

// ── 카드 라벨 규칙 ────────────────────────────────────────────────────────────
//
// 배지는 "왜 팬이 이 장소에 가는가"를 말한다. 그래서 후보에서 장소의 성격을 말하는
// 태그를 뺀다 — FOOD·EXPERIENCE 그룹 전부와, SPOT 중 팬 맥락 밖의 것
// (nature·attraction·heritage·landmark·shopping). DB 에는 그대로 있고 배지로만 안 그린다.
// 그 자리는 장소 타입(PlacePlaceType)이 대신 맡는다.

/** 장소 타입 슬롯의 그룹 키 — 태그 그룹과 겹치지 않는 이름이어야 한다 */
export const PLACE_TYPE_GROUP = "PLACE_TYPE";

/** 토픽 슬롯 하나를 만들 수 있는 최소 입력 */
export type LabelTopicInput = ColorNode & {
  nameEn: string;
  slug?: string | null;
  level?: number;
};

/** 태그 슬롯 하나를 만들 수 있는 최소 입력 */
export type LabelTagInput = {
  name: string;
  group: string;
  /** 팬 맥락 판정에 쓴다. 없으면 SPOT 태그는 후보에서 빠진다 (옛 캐시 payload 방어) */
  slug?: string | null;
  colorHex?: string | null;
  colorHex2?: string | null;
  textColorHex?: string | null;
};

/** 화면마다 모양이 다른 포스트를 여기서 한 번 좁힌다 */
export type CardLabelSource = {
  /** isVisible 이 걸러진 뒤 displayOrder 순 */
  topics: LabelTopicInput[];
  /** isVisible 이 걸러진 뒤 displayOrder 순 */
  tags: LabelTagInput[];
  /** 폴백용 장소 타입. 없으면(장소 없음·옛 캐시) 폴백 없이 태그만으로 그린다 */
  placeTypes?: readonly PlaceTypeLink[] | null;
  tagGroupMap: TagGroupColorMap;
};

/** MEDIA 그룹 전체 + SPOT 의 팬 맥락 slug 만 배지 후보다 */
export function isFanContextSlot(slot: Pick<LabelSlot, "group" | "slug">): boolean {
  if (slot.group === K_MEDIA_GROUP) return true;
  if (!slot.slug) return false;
  return (FAN_CONTEXT_TAG_SLUGS as readonly string[]).includes(slot.slug);
}

export function buildTopicSlots(topics: LabelTopicInput[]): LabelSlot[] {
  return topics.map((topic) => ({
    group: "TOPIC",
    name: topic.nameEn,
    displayLabel: null,
    colors: resolveTopicColors(topic),
    ...(topic.slug ? { slug: topic.slug } : {}),
    ...(topic.level !== undefined ? { level: topic.level } : {}),
  }));
}

/**
 * 카드 배지에서 그룹 표시명(TagGroupConfig.displayLabel)으로 뭉뚱그리지 않는 그룹.
 *
 * SPOT 에는 이제 팬 맥락 태그만 남는다. "Spot" 으로 바꿔 버리면 Filming Location 과
 * Photo Spot 이 화면에서 같은 글자가 돼 서로 구분되지 않는다 — 태그 본래 이름을 쓴다.
 * DB 의 displayLabel 은 그대로 둔다. 다른 그룹의 치환은 예전대로다.
 */
export const NO_DISPLAY_LABEL_GROUPS: readonly string[] = ["SPOT"];

/** 그 그룹이 카드에서 실제로 쓸 표시명. 치환 제외 그룹이면 null */
export function cardDisplayLabel(group: string, displayLabel: string | null | undefined): string | null {
  if (NO_DISPLAY_LABEL_GROUPS.includes(group)) return null;
  return displayLabel ?? null;
}

export function buildTagSlots(tags: LabelTagInput[], tagGroupMap: TagGroupColorMap): LabelSlot[] {
  return tags.map((tag) => {
    const gc = tagGroupMap.get(tag.group);
    return {
      group: tag.group,
      name: tag.name,
      displayLabel: cardDisplayLabel(tag.group, gc?.displayLabel),
      colors: resolveTagColors(tag, gc),
      ...(tag.slug ? { slug: tag.slug } : {}),
    };
  });
}

/** 장소 타입 하나를 슬롯으로. 색은 태그와 달리 카테고리별 상수표에서 온다 */
export function toPlaceTypeSlot(info: PlaceTypeInfo | null): LabelSlot | null {
  if (!info) return null;
  return {
    group: PLACE_TYPE_GROUP,
    name: info.name,
    displayLabel: null,
    colors: PLACE_CATEGORY_COLORS[info.category] ?? PLACE_CATEGORY_COLORS.OTHER,
  };
}

/**
 * 슬롯에서 카드 라벨을 고른다. 색 계산 방식이 달라 슬롯을 직접 만드는 곳
 * (어드민 미리보기)도 이 함수를 써서 선택 규칙만은 한 벌로 둔다.
 *
 * home  토픽 1 + [팬 맥락 태그 1 → 없으면 대표 장소 타입], 최대 2
 * list  토픽 1 + MEDIA 1 + [SPOT 팬 맥락 1 → 없으면 대표 장소 타입], 최대 3
 * 남는 칸은 예전처럼 잔여 슬롯으로 채운다 — 장소 타입은 하나뿐이라 보충에 쓰지 않는다.
 */
export function pickCardLabels(
  topicSlots: LabelSlot[],
  tagSlots: LabelSlot[],
  placeTypeSlot: LabelSlot | null,
  variant: "home" | "list",
): ResolvedLabel[] {
  const fanSlots = tagSlots.filter(isFanContextSlot);
  const selected: LabelSlot[] = [];

  if (variant === "home") {
    let ti = 0;
    let fi = 0;
    if (ti < topicSlots.length) selected.push(topicSlots[ti++]);
    if (fi < fanSlots.length) selected.push(fanSlots[fi++]);
    else if (placeTypeSlot) selected.push(placeTypeSlot);
    while (selected.length < 2) {
      if (fi < fanSlots.length) selected.push(fanSlots[fi++]);
      else if (ti < topicSlots.length) selected.push(topicSlots[ti++]);
      else break;
    }
    return finalizeSlots(selected);
  }

  const mediaSlots = fanSlots.filter((s) => s.group === K_MEDIA_GROUP);
  const spotSlots = fanSlots.filter((s) => s.group !== K_MEDIA_GROUP);
  let ti = 0;
  let mi = 0;
  let si = 0;
  if (ti < topicSlots.length) selected.push(topicSlots[ti++]);
  if (mi < mediaSlots.length) selected.push(mediaSlots[mi++]);
  if (si < spotSlots.length) selected.push(spotSlots[si++]);
  else if (placeTypeSlot) selected.push(placeTypeSlot);
  if (selected.length < 3) {
    const remaining = [...topicSlots.slice(ti), ...mediaSlots.slice(mi), ...spotSlots.slice(si)];
    for (const slot of remaining) {
      if (selected.length >= 3) break;
      selected.push(slot);
    }
  }
  return finalizeSlots(selected);
}

/**
 * 상세: 토픽 전부 + 팬 맥락 태그 전부 + 장소 타입 전부 (sortOrder 순).
 * 카드와 달리 자르지 않는다. 태그는 displayLabel 로 치환하지 않고 본래 이름을 쓴다.
 */
export function pickDetailLabels(
  topicSlots: LabelSlot[],
  tagSlots: LabelSlot[],
  placeTypeSlots: LabelSlot[],
): ResolvedLabel[] {
  const fanSlots = tagSlots.filter(isFanContextSlot);
  const toLabel = (slot: LabelSlot): ResolvedLabel => ({
    text: slot.name,
    ...slot.colors,
    ...(slot.slug ? { slug: slot.slug } : {}),
  });
  return [
    ...topicSlots.map(toLabel),
    ...fanSlots.filter((s) => s.group === K_MEDIA_GROUP).map(toLabel),
    ...fanSlots.filter((s) => s.group !== K_MEDIA_GROUP).map(toLabel),
    ...placeTypeSlots.map(toLabel),
  ];
}

/** 원본 포스트에서 카드 라벨까지 — 사용자 화면 네 곳이 쓰는 입구 */
export function selectCardLabels(src: CardLabelSource, variant: "home" | "list"): ResolvedLabel[] {
  return pickCardLabels(
    buildTopicSlots(src.topics),
    buildTagSlots(src.tags, src.tagGroupMap),
    toPlaceTypeSlot(primaryPlaceType(src.placeTypes)),
    variant,
  );
}

/**
 * 원본 포스트에서 상세 라벨까지.
 * 토픽 slug 는 level 2 일 때만 넘긴다 — 상세 메타바가 그때만 토픽 링크를 건다.
 */
export function selectDetailLabels(src: CardLabelSource): ResolvedLabel[] {
  const topicSlots = buildTopicSlots(src.topics).map((slot) =>
    slot.level === 2 ? slot : { ...slot, slug: undefined },
  );
  const placeTypeSlots = [...(src.placeTypes ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => toPlaceTypeSlot(link.placeType))
    .filter((slot): slot is LabelSlot => slot !== null);
  return pickDetailLabels(topicSlots, buildTagSlots(src.tags, src.tagGroupMap), placeTypeSlots);
}
