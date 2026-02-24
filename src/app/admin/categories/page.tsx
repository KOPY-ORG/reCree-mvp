import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { type TopicNode } from "./_components/SortableTopicList";
import { CategoriesTabContent } from "./_components/CategoriesTabContent";

// ─── 색상 상속 상수 ────────────────────────────────────────────────────────────

const DEFAULT_COLOR = "#C6FD09";
const DEFAULT_TEXT = "#000000";

// ─── 트리 유틸 ────────────────────────────────────────────────────────────────

type RawTopic = Omit<TopicNode, "children" | "effectiveColorHex" | "effectiveColorHex2" | "effectiveTextColorHex">;

function buildTree(topics: RawTopic[]): TopicNode[] {
  const map = new Map<string, TopicNode>();
  for (const t of topics) {
    map.set(t.id, { ...t, effectiveColorHex: "", effectiveColorHex2: null, effectiveTextColorHex: "", children: [] });
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
// colorHex2: colorHex가 null이면 부모로부터 상속, colorHex가 있으면 colorHex2 그대로 사용 (null=단색)
function resolveColors(
  nodes: TopicNode[],
  parentHex = DEFAULT_COLOR,
  parentHex2: string | null = null,
  parentTextHex = DEFAULT_TEXT
) {
  for (const node of nodes) {
    node.effectiveColorHex = node.colorHex ?? parentHex;
    node.effectiveColorHex2 = node.colorHex !== null ? node.colorHex2 : parentHex2;
    node.effectiveTextColorHex = node.textColorHex ?? parentTextHex;
    resolveColors(node.children, node.effectiveColorHex, node.effectiveColorHex2, node.effectiveTextColorHex);
  }
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "topic" } = await searchParams;

  const rawTopics = await prisma.topic.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      slug: true,
      type: true,
      subtype: true,
      colorHex: true,
      colorHex2: true,
      textColorHex: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      level: true,
    },
  });

  // 트리 빌드 후 색상 상속 계산
  const tree = buildTree(rawTopics);
  resolveColors(tree);

  // flat 목록에도 effective color 계산 (TopicDialog 부모 색 미리보기용)
  // rawTopics는 level asc로 이미 정렬되어 있어 부모가 먼저 처리됨
  const effectiveMap = new Map<string, { hex: string; hex2: string | null; textHex: string }>();
  for (const t of rawTopics) {
    const parent = t.parentId ? effectiveMap.get(t.parentId) : null;
    const hex = t.colorHex ?? parent?.hex ?? DEFAULT_COLOR;
    const hex2 = t.colorHex !== null ? t.colorHex2 : (parent?.hex2 ?? null);
    const textHex = t.textColorHex ?? parent?.textHex ?? DEFAULT_TEXT;
    effectiveMap.set(t.id, { hex, hex2, textHex });
  }

  const allTopicsWithEffective = rawTopics.map((t) => ({
    ...t,
    effectiveColorHex: effectiveMap.get(t.id)!.hex,
    effectiveColorHex2: effectiveMap.get(t.id)!.hex2,
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
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            Tag 관리 기능은 준비 중입니다.
          </p>
        </div>
      )}
    </div>
  );
}
