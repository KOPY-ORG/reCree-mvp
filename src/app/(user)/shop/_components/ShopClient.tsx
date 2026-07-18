"use client";

import { useMemo, useState } from "react";
import type { ShopPostItem } from "@/lib/post-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { SHOP_TAG_GROUPS, SHOP_GROUP_LABELS, type ShopTagGroup } from "../_constants";
import { ShopCard } from "./ShopCard";

type ShopTag = { id: string; name: string; group: string };
type TagGroupConfigRow = {
  group: string;
  displayLabel: string | null;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

interface Props {
  posts: ShopPostItem[];
  shopTags: ShopTag[];
  tagGroupConfigs: TagGroupConfigRow[];
}

export function ShopClient({ posts, shopTags, tagGroupConfigs }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<ShopTagGroup>(SHOP_TAG_GROUPS[0]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const tagGroupMap: TagGroupColorMap = useMemo(
    () => new Map(tagGroupConfigs.map((c) => [c.group, c])),
    [tagGroupConfigs]
  );

  const groupTags = useMemo(
    () => shopTags.filter((tag) => tag.group === selectedGroup),
    [shopTags, selectedGroup]
  );

  const filteredPosts = useMemo(() => {
    const groupTagIds = new Set(groupTags.map((t) => t.id));
    return posts.filter((post) => {
      const postTagIds = post.postTags.map(({ tag }) => tag.id);
      if (selectedTagId) return postTagIds.includes(selectedTagId);
      return postTagIds.some((id) => groupTagIds.has(id));
    });
  }, [posts, groupTags, selectedTagId]);

  function handleGroupChange(group: ShopTagGroup) {
    setSelectedGroup(group);
    setSelectedTagId(null);
  }

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex border-b border-secondary sticky top-0 bg-background z-10">
        {SHOP_TAG_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => handleGroupChange(group)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              selectedGroup === group ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {SHOP_GROUP_LABELS[group]}
            {selectedGroup === group && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 태그 칩 */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setSelectedTagId(null)}
          className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedTagId === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          All
        </button>
        {groupTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setSelectedTagId(tag.id)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedTagId === tag.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* 2열 그리드 */}
      <div className="px-4 pb-8">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-center">
            <p className="text-sm text-muted-foreground">No products yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredPosts.map((post) => (
              <ShopCard key={post.id} post={post} tagGroupMap={tagGroupMap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
