import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SortableTopicList, type TopicNode } from "./_components/SortableTopicList";

// ─── 트리 유틸 ────────────────────────────────────────────────────────────────

/** flat Topic 배열 → parentId 기준 계층 트리 변환 (sortOrder 정렬 포함) */
function buildTree(topics: Omit<TopicNode, "children">[]): TopicNode[] {
  const map = new Map<string, TopicNode>();
  for (const t of topics) {
    map.set(t.id, { ...t, children: [] });
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

function countDescendants(node: TopicNode): number {
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}

// ─── Level 0 컬럼 ─────────────────────────────────────────────────────────────

function CategoryColumn({ root }: { root: TopicNode }) {
  const totalCount = countDescendants(root);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* 컬럼 헤더 */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
        <span className="font-bold text-sm tracking-wide">{root.nameKo}</span>
        {root.nameEn && (
          <span className="text-xs text-muted-foreground">{root.nameEn}</span>
        )}
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {totalCount}
        </span>
      </div>

      {/* Level 1 목록 (드래그앤드롭) */}
      <div>
        {root.children.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            하위 항목 없음
          </p>
        ) : (
          <SortableTopicList items={root.children} level={1} />
        )}
      </div>
    </div>
  );
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
      type: true,
      colorHex: true,
      textColorHex: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      level: true,
    },
  });

  const totalCount = rawTopics.length;
  const tree = buildTree(rawTopics);

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
        <div className="mt-6">
          {/* 요약 stat */}
          <p className="text-sm text-muted-foreground mb-4">
            {tree.map((r) => r.nameKo).join(" · ")} 아티스트, 작품 분류 관리
            &nbsp;
            <span className="font-medium text-foreground">전체 {totalCount}</span>
          </p>

          {/* 2컬럼 그리드 */}
          <div className="grid grid-cols-2 gap-4">
            {tree.map((root) => (
              <CategoryColumn key={root.id} root={root} />
            ))}
          </div>
        </div>
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
