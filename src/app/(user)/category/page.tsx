import { redirect } from "next/navigation";
import { getLevel0Topics, getTopicChildren } from "@/lib/topic-queries";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { CategorySidebar } from "./_components/CategorySidebar";
import { CategoryTopicGrid, CategoryTagGrid } from "./_components/CategoryTopicGrid";

export default async function CategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ topicId?: string; groupId?: string }>;
}) {
  const { topicId, groupId } = await searchParams;

  const [level0Topics, tagGroups] = await Promise.all([
    getLevel0Topics(),
    getTagGroupsWithTags(),
  ]);

  // 사이드바 통합 목록: Level 0 Topics 먼저, 그 다음 Topics에 없는 TagGroups
  const topicGroupKeys = new Set(
    level0Topics.map((t) => t.nameEn.replace(/^K-/i, "").toLowerCase())
  );
  const extraTagGroups = tagGroups.filter(
    (g) => !topicGroupKeys.has(g.nameEn.toLowerCase())
  );

  const sidebarItems = [
    ...level0Topics.map((t) => ({
      kind: "topic" as const,
      id: t.id,
      nameEn: t.nameEn,
      colorHex: t.colorHex,
    })),
    ...extraTagGroups.map((g) => ({
      kind: "group" as const,
      group: g.group,
      nameEn: g.nameEn,
      colorHex: g.colorHex,
    })),
  ];

  if (sidebarItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">
        No categories yet.
      </div>
    );
  }

  // 아무것도 선택 안 됐으면 첫 번째 항목으로 redirect
  if (!topicId && !groupId) {
    const first = sidebarItems[0];
    const target =
      first.kind === "topic"
        ? `/category?topicId=${first.id}`
        : `/category?groupId=${first.group}`;
    redirect(target);
  }

  return (
    // AppHeader h-14 (3.5rem) + BottomNav h-16 (4rem) = 7.5rem
    <div className="flex h-[calc(100dvh-7.5rem)] overflow-hidden">
      {/* 사이드바 */}
      <div className="w-28 shrink-0 overflow-hidden bg-zinc-100">
        <CategorySidebar items={sidebarItems} />
      </div>

      {/* 오른쪽 패널 */}
      <div className="flex-1 overflow-y-auto">
        {groupId ? (
          // TagGroup 선택됨
          (() => {
            const tagGroup = tagGroups.find((g) => g.group === groupId);
            if (!tagGroup) return null;
            return <CategoryTagGrid tagGroup={tagGroup} />;
          })()
        ) : topicId ? (
          // Level 0 Topic 선택됨
          (() => {
            const activeTopic =
              level0Topics.find((t) => t.id === topicId) ?? level0Topics[0];
            return (
              <TopicPanelLoader
                topicId={activeTopic.id}
                parentTopic={activeTopic}
                tagGroups={tagGroups}
              />
            );
          })()
        ) : null}
      </div>
    </div>
  );
}

// Server Component: Level 1 Topics 비동기 로드
async function TopicPanelLoader({
  topicId,
  parentTopic,
  tagGroups,
}: {
  topicId: string;
  parentTopic: {
    id: string;
    nameEn: string;
    colorHex: string | null;
    colorHex2: string | null;
    gradientDir: string;
    gradientStop: number;
    textColorHex: string | null;
    parentId: string | null;
  };
  tagGroups: Awaited<ReturnType<typeof getTagGroupsWithTags>>;
}) {
  const { level1Topics } = await getTopicChildren(topicId);
  return (
    <CategoryTopicGrid
      level1Topics={level1Topics}
      parentTopic={parentTopic}
      tagGroups={tagGroups}
    />
  );
}
