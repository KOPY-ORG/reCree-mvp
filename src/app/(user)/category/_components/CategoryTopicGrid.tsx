import Link from "next/link";
import { resolveTopicColors } from "@/lib/post-labels";
import { TopicCircle } from "./TopicCircle";

type ChildTopic = {
  id: string;
  nameEn: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
  parentId: string | null;
};

type Level1Topic = ChildTopic & {
  children: ChildTopic[];
};

type ParentTopic = ChildTopic;

type Tag = {
  id: string;
  name: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
};

type TagGroup = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: Tag[];
};

/** 항상 상단에 표시되는 "All" 원형 칩 */
function AllCircle({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
    >
      <div className="w-full aspect-square rounded-full flex items-center justify-center font-bold text-sm bg-zinc-900 text-white">
        All
      </div>
      <span className="text-[10px] text-center text-foreground leading-tight">
        All
      </span>
    </Link>
  );
}

/** TagGroup 선택 시: 해당 그룹의 태그 원형 칩 표시 */
export function CategoryTagGrid({ tagGroup }: { tagGroup: TagGroup }) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <AllCircle href="/explore" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {tagGroup.tags.map((tag) => (
          <TopicCircle
            key={tag.id}
            href={`/explore?tagId=${tag.id}`}
            name={tag.name}
            colorHex={tag.colorHex ?? tagGroup.colorHex}
            colorHex2={tag.colorHex ? tag.colorHex2 : tagGroup.colorHex2}
            gradientDir={tagGroup.gradientDir}
            gradientStop={tagGroup.gradientStop}
            textColorHex={tag.textColorHex ?? tagGroup.textColorHex}
          />
        ))}
      </div>
    </div>
  );
}

/** Level 0 Topic 선택 시: Level 1 자식 또는 매칭 TagGroup 태그 표시 */
export function CategoryTopicGrid({
  level1Topics,
  parentTopic,
  tagGroups,
}: {
  level1Topics: Level1Topic[];
  parentTopic: ParentTopic;
  tagGroups: TagGroup[];
}) {
  // Level 1 자식 없는 경우 → 이름 기반 매칭 TagGroup 태그 표시
  if (level1Topics.length === 0) {
    const suffix = parentTopic.nameEn.replace(/^K-/i, "").toLowerCase();
    const matchingGroup = tagGroups.find(
      (g) => g.nameEn.toLowerCase() === suffix
    );

    if (!matchingGroup || matchingGroup.tags.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No subcategories yet.
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <AllCircle href={`/explore?topicId=${parentTopic.id}`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {matchingGroup.tags.map((tag) => (
            <TopicCircle
              key={tag.id}
              href={`/explore?tagId=${tag.id}`}
              name={tag.name}
              colorHex={tag.colorHex ?? matchingGroup.colorHex}
              colorHex2={
                tag.colorHex ? tag.colorHex2 : matchingGroup.colorHex2
              }
              gradientDir={matchingGroup.gradientDir}
              gradientStop={matchingGroup.gradientStop}
              textColorHex={tag.textColorHex ?? matchingGroup.textColorHex}
            />
          ))}
        </div>
      </div>
    );
  }

  // K-Pop 스타일: Level 1이 바로 원형 칩 (Level 2 없음)
  const hasLevel2 = level1Topics.some((t) => t.children.length > 0);

  if (!hasLevel2) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <AllCircle href={`/explore?topicId=${parentTopic.id}`} />
          {level1Topics.map((topic) => {
            const colors = resolveTopicColors({ ...topic, parent: parentTopic });
            return (
              <TopicCircle
                key={topic.id}
                href={`/explore?topicId=${topic.id}`}
                name={topic.nameEn}
                {...colors}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // K-Contents 스타일: Level 1이 섹션 헤더, Level 2가 원형 칩
  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <AllCircle href={`/explore?topicId=${parentTopic.id}`} />
      </div>
      {level1Topics.map((l1) => {
        const l1Colors = resolveTopicColors({ ...l1, parent: parentTopic });

        if (l1.children.length === 0) {
          return (
            <div key={l1.id} className="grid grid-cols-3 gap-3">
              <TopicCircle
                href={`/explore?topicId=${l1.id}`}
                name={l1.nameEn}
                {...l1Colors}
              />
            </div>
          );
        }

        return (
          <div key={l1.id}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 text-foreground">
              {l1.nameEn}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {l1.children.map((l2) => {
                const l2Colors = resolveTopicColors({ ...l2, parent: l1 });
                return (
                  <TopicCircle
                    key={l2.id}
                    href={`/explore?topicId=${l2.id}`}
                    name={l2.nameEn}
                    {...l2Colors}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
