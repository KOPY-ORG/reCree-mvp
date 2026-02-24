import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { type TopicNode } from "./_components/SortableTopicList";
import { CategoriesTabContent } from "./_components/CategoriesTabContent";
import { TagsTabContent } from "./_components/TagsTabContent";
import type { TagItem, TagGroupConfigItem } from "./_components/SortableTagList";
import { TagGroup } from "@prisma/client";

const ALL_GROUPS: TagGroup[] = ["FOOD", "SPOT", "EXPERIENCE", "ITEM", "BEAUTY"];

// ─── 색상 상속 상수 ────────────────────────────────────────────────────────────

const DEFAULT_COLOR = "#C6FD09";
const DEFAULT_TEXT = "#000000";

// ─── 트리 유틸 ────────────────────────────────────────────────────────────────

type RawTopic = Omit<TopicNode, "children" | "effectiveColorHex" | "effectiveColorHex2" | "effectiveGradientDir" | "effectiveGradientStop" | "effectiveTextColorHex">;

function buildTree(topics: RawTopic[]): TopicNode[] {
  const map = new Map<string, TopicNode>();
  for (const t of topics) {
    map.set(t.id, { ...t, effectiveColorHex: "", effectiveColorHex2: null, effectiveGradientDir: "to bottom", effectiveGradientStop: 150, effectiveTextColorHex: "", children: [] });
  }

  const roots: TopicNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortNodes(roots);
  return roots;
}

function sortNodes(nodes: TopicNode[]) {
  nodes.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const n of nodes) sortNodes(n.children);
}

// DFS로 effective color 계산 (colorHex null = 부모 상속)
// colorHex2/gradientDir/gradientStop: colorHex가 null이면 부모로부터 상속, colorHex가 있으면 자체 값 사용
function resolveColors(
  nodes: TopicNode[],
  parentHex = DEFAULT_COLOR,
  parentHex2: string | null = null,
  parentGradientDir = "to bottom",
  parentGradientStop = 150,
  parentTextHex = DEFAULT_TEXT
) {
  for (const node of nodes) {
    const inherits = node.colorHex === null;
    node.effectiveColorHex = node.colorHex ?? parentHex;
    node.effectiveColorHex2 = inherits ? parentHex2 : node.colorHex2;
    node.effectiveGradientDir = inherits ? parentGradientDir : node.gradientDir;
    node.effectiveGradientStop = inherits ? parentGradientStop : node.gradientStop;
    node.effectiveTextColorHex = node.textColorHex ?? parentTextHex;
    resolveColors(
      node.children,
      node.effectiveColorHex,
      node.effectiveColorHex2,
      node.effectiveGradientDir,
      node.effectiveGradientStop,
      node.effectiveTextColorHex
    );
  }
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "topic" } = await searchParams;

  const [rawTopics, rawTags, rawGroupConfigs] = await Promise.all([
    prisma.topic.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        nameKo: true,
        nameEn: true,
        slug: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
        isActive: true,
        sortOrder: true,
        parentId: true,
        level: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        group: true,
        colorHex: true,
        colorHex2: true,
        textColorHex: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  // 트리 빌드 후 색상 상속 계산
  const tree = buildTree(rawTopics);
  resolveColors(tree);

  // Tag: 그룹 config 맵 + effective color 계산 후 group별 분리
  const groupConfigMap = new Map(rawGroupConfigs.map((c) => [c.group as string, c]));

  // 존재하지 않는 그룹은 기본값으로 채움
  const groupConfigs: TagGroupConfigItem[] = ALL_GROUPS.map((group) => ({
    group,
    nameEn: "",
    colorHex: "#C6FD09",
    colorHex2: null,
    gradientDir: "to bottom",
    gradientStop: 150,
    textColorHex: "#000000",
    ...(groupConfigMap.get(group) ?? {}),
  }));

  const DEFAULT_GROUP_COLOR = { colorHex: "#C6FD09", colorHex2: null as string | null, gradientDir: "to bottom", gradientStop: 150, textColorHex: "#000000" };

  const tagsByGroup = rawTags.reduce<Record<string, TagItem[]>>((acc, tag) => {
    const gc = groupConfigMap.get(tag.group) ?? DEFAULT_GROUP_COLOR;
    const effectiveColorHex = tag.colorHex ?? gc.colorHex;
    const effectiveColorHex2 = tag.colorHex !== null ? tag.colorHex2 : gc.colorHex2;
    const effectiveGradientDir = gc.gradientDir ?? "to bottom";
    const effectiveGradientStop = gc.gradientStop ?? 150;
    const effectiveTextColorHex = tag.textColorHex ?? gc.textColorHex;
    (acc[tag.group] ??= []).push({
      ...tag,
      effectiveColorHex,
      effectiveColorHex2,
      effectiveGradientDir,
      effectiveGradientStop,
      effectiveTextColorHex,
    } as TagItem);
    return acc;
  }, {});

  // flat 목록에도 effective color 계산 (TopicDialog 부모 색 미리보기용)
  // rawTopics는 level asc로 이미 정렬되어 있어 부모가 먼저 처리됨
  const effectiveMap = new Map<string, { hex: string; hex2: string | null; gradientDir: string; gradientStop: number; textHex: string }>();
  for (const t of rawTopics) {
    const parent = t.parentId ? effectiveMap.get(t.parentId) : null;
    const inherits = t.colorHex === null;
    const hex = t.colorHex ?? parent?.hex ?? DEFAULT_COLOR;
    const hex2 = inherits ? (parent?.hex2 ?? null) : t.colorHex2;
    const gradientDir = inherits ? (parent?.gradientDir ?? "to bottom") : t.gradientDir;
    const gradientStop = inherits ? (parent?.gradientStop ?? 150) : t.gradientStop;
    const textHex = t.textColorHex ?? parent?.textHex ?? DEFAULT_TEXT;
    effectiveMap.set(t.id, { hex, hex2, gradientDir, gradientStop, textHex });
  }

  const allTopicsWithEffective = rawTopics.map((t) => ({
    ...t,
    effectiveColorHex: effectiveMap.get(t.id)!.hex,
    effectiveColorHex2: effectiveMap.get(t.id)!.hex2,
    effectiveGradientDir: effectiveMap.get(t.id)!.gradientDir,
    effectiveGradientStop: effectiveMap.get(t.id)!.gradientStop,
    effectiveTextColorHex: effectiveMap.get(t.id)!.textHex,
  }));

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">분류 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Topic과 Tag 분류 관리
        </p>
      </div>

      {/* 탭 (pill 스타일) */}
      <div className="flex gap-2 mt-6">
        <Link
          href="?tab=topic"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === "topic"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          ♪ Topic
        </Link>
        <Link
          href="?tab=tag"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === "tag"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          # Tag
        </Link>
      </div>

      {tab === "topic" && (
        <CategoriesTabContent tree={tree} allTopics={allTopicsWithEffective} />
      )}

      {tab === "tag" && (
        <TagsTabContent tagsByGroup={tagsByGroup} groupConfigs={groupConfigs} />
      )}
    </div>
  );
}
