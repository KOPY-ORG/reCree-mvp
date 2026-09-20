// 포스트 라벨 색상 헬퍼 — 홈·탐색 등 여러 페이지에서 공유
import type React from "react";
import type { PlaceCategory } from "@prisma/client";
import { primaryPlaceType, type PlaceTypeInfo, type PlaceTypeLink } from "@/lib/place-types";

/** K-MEDIA 태그 그룹 PK — 변경 시 DB TagGroupConfig.group과 동기화 */
export const K_MEDIA_GROUP = "MEDIA";

/**
 * 팬 맥락 태그 — "왜 팬이 이 장소에 가는가"를 말하는 태그.
 *
 * MEDIA 는 그룹 전체가 팬 맥락이라 K_MEDIA_GROUP 으로 식별한다 — 여기 넣지 않는다.
 * group 이 아니라 slug 로 거르는 이유는 SPOT 이 한 그룹 안에서 갈리기 때문이고,
 * name 이 아니라 slug 인 이유는 이름은 어드민에서 바뀌기 때문이다.
 *
 * photo-spot 은 "왜 가는가" 가 아니라 "어떤 결의 장소인가" 라서 VIBE_TAG_SLUGS 로 옮겼다.
 * filming-location 은 어느 쪽도 아니다 — 어느 작품인지는 MEDIA 태그가 이미 말한다.
 * 두 목록 어디에도 없으면 카드·필터·상세 모두에서 그려지지 않는다 (데이터는 정리 단계에서 삭제).
 */
export const FAN_CONTEXT_TAG_SLUGS = ["fan-spot"] as const;

/**
 * 분위기 태그 — 장소의 성격도, 팬이 가는 이유도 아닌 "어떤 결의 장소인가".
 *
 * 지금은 SPOT 그룹에 섞여 있고, 데이터 이전 뒤에는 VIBE 그룹으로 옮겨간다.
 * 그래서 그룹을 보지 않고 slug 로만 판정한다 — 이전 전후 양쪽에서 같은 코드가 돈다.
 *
 * 필터 시트와 상세에는 나오고 카드에는 나오지 않는다.
 */
export const VIBE_TAG_SLUGS = ["photo-spot", "local", "vintageretro"] as const;

/**
 * 장소 타입 배지 색. 태그와 달리 PlaceType 에는 색 칸이 없어 카테고리별로 코드가 정한다.
 *
 * 태그 그룹 색(TagGroupConfig)과 겹치지 않아야 카드에서 둘이 구분된다 —
 * K-FOOD(#FFE592→#ffae00)·K-SPOT(#ffed94→#ffee33)이 이미 노랑 계열이라
 * 먹는 것과 명소는 그 둘을 그대로 잇고, 나머지는 비는 색을 쓴다.
 */
export const PLACE_CATEGORY_COLORS: Record<PlaceCategory, Omit<ResolvedLabel, "text" | "slug">> = {
  EAT:           { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  CAFE:          { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  BAR:           { colorHex: "#FFE592", colorHex2: "#ffae00", gradientDir: "to bottom", gradientStop: 90,  textColorHex: "#000000" },
  ATTRACTIONS:   { colorHex: "#ffed94", colorHex2: "#ffee33", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  ENTERTAINMENT: { colorHex: "#B8D4FF", colorHex2: "#6FA8FF", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  EXPERIENCE:    { colorHex: "#ff8f66", colorHex2: "#fb5209", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#FFFFFF" },
  SHOP:          { colorHex: "#88fbe2", colorHex2: "#00ffc8", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  STAY:          { colorHex: "#E2D6FF", colorHex2: "#BFA6FF", gradientDir: "to bottom", gradientStop: 75,  textColorHex: "#000000" },
  OTHER:         { colorHex: "#E4E4E7", colorHex2: null,      gradientDir: "to bottom", gradientStop: 150, textColorHex: "#000000" },
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
  /** 있으면 /topics/<slug> 로 링크한다. 토픽 배지만 갖는다 */
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
  /** 규칙 판정용 원본 slug (팬 맥락 태그 식별). 링크와 무관하다 */
  slug?: string;
  /**
   * 배지에 걸 링크의 slug. 토픽만 갖는다.
   * 태그·장소 타입에는 갈 페이지가 없다 — 여기 값을 넣으면 /topics/<태그slug> 로 가 404 가 난다.
   */
  linkSlug?: string;
  /** 토픽 계층 레벨 — shop selector의 멤버 우선 선택용. 없으면 배열 순서 폴백 */
  level?: number;
};

/** 슬롯 배열을 ResolvedLabel[]로 변환 (displayLabel 결정 포함). 순서는 받은 그대로 */
function toResolvedLabels(selected: LabelSlot[]): ResolvedLabel[] {
  return selected.map((slot) => {
    const hasOtherGroup = selected.some((s) => s.group !== slot.group);
    const text = slot.displayLabel && hasOtherGroup ? slot.displayLabel : slot.name;
    return { text, ...slot.colors, ...(slot.linkSlug ? { slug: slot.linkSlug } : {}) };
  });
}

/** 그룹 우선순위로 정렬한 뒤 변환 — 고를 때 순서를 정하지 않는 곳(shop)이 쓴다 */
function finalizeSlots(selected: LabelSlot[]): ResolvedLabel[] {
  selected.sort((a, b) => labelGroupOrder(a.group) - labelGroupOrder(b.group));
  return toResolvedLabels(selected);
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
// 배지는 "왜 팬이 이 장소에 가는가"를 말한다. 그래서 카드에 오는 태그는 팬 맥락
// (MEDIA 그룹 전부 + fan-spot) 하나뿐이다. 장소의 성격을 말하는 태그(FOOD·EXPERIENCE
// 그룹 전부와 SPOT 의 nature·attraction·heritage·landmark·shopping)도, 분위기 태그도
// 카드에 나오지 않는다. DB 에는 그대로 있고 배지로만 안 그린다.
// 장소의 성격은 장소 타입(PlacePlaceType)이 대신 맡는다.

/** 장소 타입 슬롯의 그룹 키 — 태그 그룹과 겹치지 않는 이름이어야 한다 */
export const PLACE_TYPE_GROUP = "PLACE_TYPE";

/** 토픽 슬롯 하나를 만들 수 있는 최소 입력 */
export type LabelTopicInput = ColorNode & {
  nameEn: string;
  slug?: string | null;
  level?: number;
};

/**
 * 토픽 배지가 걸 링크의 slug. 없으면 링크하지 않는다.
 *
 * /topics/[slug] 는 level 2 만 받는다 (topic-queries.getTopicBySlug 의 where).
 * L0·L1·L3 은 갈 페이지가 없어 링크하지 않는다 — 옛 동작 그대로다.
 */
export function topicLinkSlug(topic: LabelTopicInput): string | undefined {
  return topic.level === 2 ? (topic.slug ?? undefined) : undefined;
}

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

/** MEDIA 그룹 전체 + 팬 맥락 slug. 카드 배지 후보는 이것뿐이다 */
export function isFanContextSlot(slot: Pick<LabelSlot, "group" | "slug">): boolean {
  if (slot.group === K_MEDIA_GROUP) return true;
  if (!slot.slug) return false;
  return (FAN_CONTEXT_TAG_SLUGS as readonly string[]).includes(slot.slug);
}

/** 분위기 태그인가. 그룹은 보지 않는다 (VIBE 그룹으로 옮겨가도 그대로 동작한다) */
export function isVibeSlot(slot: Pick<LabelSlot, "slug">): boolean {
  return slot.slug !== undefined && (VIBE_TAG_SLUGS as readonly string[]).includes(slot.slug);
}

/** 필터 시트에 그리는 태그 — MEDIA 전부 + fan-spot + 분위기 3종 */
export function isFilterableTagSlot(slot: Pick<LabelSlot, "group" | "slug">): boolean {
  return isFanContextSlot(slot) || isVibeSlot(slot);
}

export function buildTopicSlots(topics: LabelTopicInput[]): LabelSlot[] {
  return topics.map((topic) => {
    const linkSlug = topicLinkSlug(topic);
    return {
      group: "TOPIC",
      name: topic.nameEn,
      displayLabel: null,
      colors: resolveTopicColors(topic),
      ...(linkSlug ? { linkSlug } : {}),
      ...(topic.level !== undefined ? { level: topic.level } : {}),
    };
  });
}

export function buildTagSlots(tags: LabelTagInput[], tagGroupMap: TagGroupColorMap): LabelSlot[] {
  return tags.map((tag) => {
    const gc = tagGroupMap.get(tag.group);
    return {
      group: tag.group,
      name: tag.name,
      displayLabel: gc?.displayLabel ?? null,
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
 * 순서는 고정이다 — 대표 토픽 → 팬 맥락 태그 → 대표 장소 타입.
 * list  세 칸: 세 종류를 이 순서 그대로
 * home  두 칸: 이 순서에서 있는 것부터 둘
 *
 * 종류마다 카드에 최대 하나다. 토픽이 둘이어도 둘째는 카드에 안 나오고, 앞 종류가
 * 비면 뒤 종류가 당겨 채운다 (토픽 없음 → 태그·타입, 태그 없음 → 토픽·타입).
 * 분위기 태그는 카드 후보가 아니다 — 상세와 필터 시트에서만 보인다.
 */
export function pickCardLabels(
  topicSlots: LabelSlot[],
  tagSlots: LabelSlot[],
  placeTypeSlot: LabelSlot | null,
  variant: "home" | "list",
): ResolvedLabel[] {
  const cap = variant === "home" ? 2 : 3;
  const selected = [topicSlots[0], tagSlots.find(isFanContextSlot), placeTypeSlot]
    .filter((slot): slot is LabelSlot => slot != null)
    .slice(0, cap);
  // 이미 보여줄 순서대로 골랐다 — finalizeSlots 의 그룹 정렬을 태우지 않는다
  return toResolvedLabels(selected);
}

/**
 * 상세: 토픽 전부 → 팬 맥락 태그 전부(MEDIA 먼저) → 분위기 태그 → 장소 타입 전부(sortOrder 순).
 * 카드와 달리 자르지 않는다. 태그는 displayLabel 로 치환하지 않고 본래 이름을 쓴다.
 * 두 목록 어디에도 없는 태그(filming-location)는 상세에도 안 나온다.
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
    ...(slot.linkSlug ? { slug: slot.linkSlug } : {}),
  });
  return [
    ...topicSlots.map(toLabel),
    ...fanSlots.filter((s) => s.group === K_MEDIA_GROUP).map(toLabel),
    ...fanSlots.filter((s) => s.group !== K_MEDIA_GROUP).map(toLabel),
    ...tagSlots.filter(isVibeSlot).map(toLabel),
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

/** 원본 포스트에서 상세 라벨까지. 링크는 topicLinkSlug 가 정한다 */
export function selectDetailLabels(src: CardLabelSource): ResolvedLabel[] {
  const topicSlots = buildTopicSlots(src.topics);
  const placeTypeSlots = [...(src.placeTypes ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => toPlaceTypeSlot(link.placeType))
    .filter((slot): slot is LabelSlot => slot !== null);
  return pickDetailLabels(topicSlots, buildTagSlots(src.tags, src.tagGroupMap), placeTypeSlots);
}
