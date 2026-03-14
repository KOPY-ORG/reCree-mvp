"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  badgeRingStyle,
  DEFAULT_TEXT,
  DEFAULT_COLOR,
} from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { AllBadge } from "@/components/AllBadge";

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

type Level2Topic = ChildTopic & {
  children: ChildTopic[];
};

type Level1Topic = ChildTopic & {
  children: Level2Topic[];
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


/** TagGroup 선택 시: 해당 그룹의 태그 pill 표시 */
export function CategoryTagGrid({ tagGroup }: { tagGroup: TagGroup }) {
  return (
    <div className="p-4 space-y-6 [--pill-py:0.25rem]">
      <AllBadge href={`/explore?tagGroup=${tagGroup.group}`} className="mb-4" />
      <div className="flex flex-wrap gap-x-2 gap-y-2.5">
        {tagGroup.tags.map((tag) => {
          const resolved = resolveTagColors(tag, tagGroup);
          const bg = labelBackground({ text: "", ...resolved });
          const fg = tag.textColorHex ?? tagGroup.textColorHex ?? DEFAULT_TEXT;
          return (
            <Link key={tag.id} href={`/explore?tagId=${tag.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
              {tag.name}
            </Link>
          );
        })}
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
  const [expandedL2Id, setExpandedL2Id] = useState<string | null>(null);

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
      <div className="p-4 space-y-6 [--pill-py:0.25rem]">
        <AllBadge href={`/explore?tagGroup=${matchingGroup.group}`} className="mb-4" />
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {matchingGroup.tags.map((tag) => {
            const resolved = resolveTagColors(tag, matchingGroup);
            const bg = labelBackground({ text: "", ...resolved });
            const fg = tag.textColorHex ?? matchingGroup.textColorHex ?? DEFAULT_TEXT;
            return (
              <Link key={tag.id} href={`/explore?tagId=${tag.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
                {tag.name}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Level 1이 바로 pill 칩 (Level 2 없음)
  const hasLevel2 = level1Topics.some((t) => t.children.length > 0);

  if (!hasLevel2) {
    return (
      <div className="p-4 space-y-6 [--pill-py:0.25rem]">
        <AllBadge href={`/explore?topicId=${parentTopic.id}`} className="mb-4" />
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {level1Topics.map((topic) => {
            const colors = resolveTopicColors({ ...topic, parent: parentTopic });
            const bg = labelBackground({ text: "", ...colors });
            const fg = colors.textColorHex ?? DEFAULT_TEXT;
            return (
              <Link key={topic.id} href={`/explore?topicId=${topic.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
                {topic.nameEn}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Level 1이 섹션 헤더, Level 2가 pill 칩
  return (
    <div className="p-4 space-y-6 [--pill-py:0.25rem]">
      <AllBadge href={`/explore?topicId=${parentTopic.id}`} className="mb-4" />
      {level1Topics.map((l1) => {
        const l1Colors = resolveTopicColors({ ...l1, parent: parentTopic });
        const expandedL2 = l1.children.find((l2) => l2.id === expandedL2Id) ?? null;
        const expandedL2Bg = expandedL2
          ? labelBackground({ text: "", ...resolveTopicColors({ ...expandedL2, parent: { ...l1, parent: parentTopic } }) })
          : null;

        if (l1.children.length === 0) {
          const bg = labelBackground({ text: "", ...l1Colors });
          const fg = l1Colors.textColorHex ?? DEFAULT_TEXT;
          return (
            <div key={l1.id} className="flex flex-wrap gap-x-2 gap-y-2.5">
              <Link href={`/explore?topicId=${l1.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
                {l1.nameEn}
              </Link>
            </div>
          );
        }

        return (
          <div key={l1.id}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 text-foreground">
              {l1.nameEn}
            </h3>
            <div className="flex flex-wrap gap-x-2 gap-y-2.5">
              <AllBadge href={`/explore?topicId=${l1.id}`} />
              {l1.children.map((l2) => {
                const l2Colors = resolveTopicColors({ ...l2, parent: { ...l1, parent: parentTopic } });
                const bg = labelBackground({ text: "", ...l2Colors });
                const fg = l2Colors.textColorHex ?? DEFAULT_TEXT;
                const hasChildren = l2.children.length > 0;
                const isExpanded = expandedL2Id === l2.id;

                if (!hasChildren) {
                  return (
                    <Link key={l2.id} href={`/explore?topicId=${l2.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
                      {l2.nameEn}
                    </Link>
                  );
                }

                return (
                  <LabelBadge
                    key={l2.id}
                    as="button"
                    text={l2.nameEn}
                    background={bg}
                    color={fg}
                    className="transition-all active:opacity-70"
                    style={badgeRingStyle(l2.colorHex ?? l1.colorHex ?? null, isExpanded)}
                    onClick={() => setExpandedL2Id(isExpanded ? null : l2.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="size-3 opacity-70" />
                    ) : (
                      <ChevronDown className="size-3 opacity-70" />
                    )}
                  </LabelBadge>
                );
              })}
            </div>

            {/* L3 펼침 카드 */}
            {expandedL2 && expandedL2Bg && (
              <div className="rounded-2xl bg-muted/60 p-4 mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: expandedL2Bg }}
                  />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {expandedL2.nameEn}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                  <AllBadge href={`/explore?topicId=${expandedL2.id}`} />
                  {expandedL2.children.map((l3) => {
                    const l3Colors = resolveTopicColors({
                      ...l3,
                      parent: { ...expandedL2, parent: { ...l1, parent: parentTopic } },
                    });
                    const bg = labelBackground({ text: "", ...l3Colors });
                    const fg = l3Colors.textColorHex ?? DEFAULT_TEXT;
                    return (
                      <Link key={l3.id} href={`/explore?topicId=${l3.id}`} className="pill-badge" style={{ background: bg, color: fg }}>
                        {l3.nameEn}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
