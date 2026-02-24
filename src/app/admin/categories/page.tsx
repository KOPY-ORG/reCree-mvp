import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicType } from "@prisma/client";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TopicNode {
  id: string;
  nameKo: string;
  nameEn: string;
  slug: string;
  type: TopicType;
  subtype: string | null;
  level: number;
  parentId: string | null;
  colorHex: string;
  textColorHex: string;
  isActive: boolean;
  sortOrder: number;
  children: TopicNode[];
}

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

// ─── 배지 상수 ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<TopicType, string> = {
  CATEGORY: "카테고리",
  GROUP: "그룹",
  PERSON: "인물",
  WORK: "작품",
  SEASON: "시즌",
  OTHER: "기타",
};

const TYPE_COLOR: Record<TopicType, string> = {
  CATEGORY: "bg-violet-100 text-violet-700",
  GROUP: "bg-blue-100 text-blue-700",
  PERSON: "bg-pink-100 text-pink-700",
  WORK: "bg-amber-100 text-amber-700",
  SEASON: "bg-emerald-100 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-600",
};

// ─── 공용 컴포넌트 ────────────────────────────────────────────────────────────

function ActiveDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isActive ? "bg-green-500" : "bg-gray-300"
      }`}
    />
  );
}

function TypeBadge({ type }: { type: TopicType }) {
  return (
    <span
      className={`ml-auto text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TYPE_COLOR[type]}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

// ─── Level 3 행 ───────────────────────────────────────────────────────────────

function Level3Row({ node }: { node: TopicNode }) {
  return (
    <div className="flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm">
      <span className="w-3 shrink-0" />
      <ActiveDot isActive={node.isActive} />
      <span className="font-medium">{node.nameKo}</span>
      <span className="text-xs text-muted-foreground">{node.nameEn}</span>
      <TypeBadge type={node.type} />
    </div>
  );
}

// ─── Level 2 행 (자식 있으면 아코디언) ───────────────────────────────────────

function Level2Row({ node }: { node: TopicNode }) {
  const hasChildren = node.children.length > 0;

  // 자식 없는 일반 행
  if (!hasChildren) {
    return (
      <div className="flex items-center gap-2 pl-3 pr-3 py-1.5 text-sm">
        <span className="w-3 shrink-0" />
        <ActiveDot isActive={node.isActive} />
        <span className="font-medium">{node.nameKo}</span>
        <span className="text-xs text-muted-foreground">{node.nameEn}</span>
        <TypeBadge type={node.type} />
      </div>
    );
  }

  return (
    <details className="group/l2">
      <summary className="list-none flex items-center gap-2 pl-3 pr-3 py-1.5 cursor-pointer hover:bg-muted/20 text-sm">
        {/* 화살표: 열리면 90도 회전 (named group/l2 기준) */}
        <span className="w-3 h-3 flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-150 group-open/l2:rotate-90">
          ›
        </span>
        <ActiveDot isActive={node.isActive} />
        <span className="font-medium">{node.nameKo}</span>
        <span className="text-xs text-muted-foreground">{node.nameEn}</span>
        {/* 접혔을 때만 +N 표시 */}
        <span className="text-xs text-muted-foreground group-open/l2:hidden">
          +{node.children.length}
        </span>
        <TypeBadge type={node.type} />
      </summary>
      <div>
        {node.children.map((child) => (
          <Level3Row key={child.id} node={child} />
        ))}
      </div>
    </details>
  );
}

// ─── Level 1 섹션 (항상 렌더링, level 2 자식을 아코디언으로) ─────────────────

function Level1Section({ node }: { node: TopicNode }) {
  const hasChildren = node.children.length > 0;

  return (
    <details className="group/l1 border-b border-border/20 last:border-0">
      <summary className="list-none flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-muted/20">
        {/* 화살표: 열리면 90도 회전 (named group/l1 기준) */}
        <span className="w-3 h-3 flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-150 group-open/l1:rotate-90">
          ›
        </span>
        <span className="font-semibold text-sm">{node.nameKo}</span>
        {node.nameEn && (
          <span className="text-xs text-muted-foreground">{node.nameEn}</span>
        )}
        {/* 접혔을 때만 +N 표시 */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground group-open/l1:hidden">
            +{node.children.length}
          </span>
        )}
      </summary>

      {hasChildren && (
        <div className="pb-1">
          {node.children.map((child) => (
            <Level2Row key={child.id} node={child} />
          ))}
        </div>
      )}
    </details>
  );
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

      {/* Level 1 목록 */}
      <div>
        {root.children.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            하위 항목 없음
          </p>
        ) : (
          root.children.map((child) => (
            <Level1Section key={child.id} node={child} />
          ))
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

  // sortOrder 기준 정렬 (level 먼저, 같은 level 내에서 sortOrder)
  const rawTopics = await prisma.topic.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
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
            <span className="font-medium text-foreground">
              전체 {totalCount}
            </span>
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
