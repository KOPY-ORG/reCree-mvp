"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TagFilterRow as TagFilterRowBase, type TagGroupForFilter } from "@/components/TagFilterRow";

export type { TagGroupForFilter as TagGroup };

export function TagFilterRow({ tagGroups }: { tagGroups: TagGroupForFilter[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildGroupParams(groupName: string, newTagId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const group = tagGroups.find((g) => g.group === groupName);
    const groupTagIds = new Set(group?.tags.map((t) => t.id) ?? []);
    params.delete("tagId");
    for (const id of searchParams.getAll("tagId")) {
      if (!groupTagIds.has(id)) params.append("tagId", id);
    }
    if (newTagId) params.append("tagId", newTagId);
    params.delete("tagGroup");
    if (!newTagId) params.set("tagGroup", groupName);
    params.delete("tab");
    return params;
  }

  function handleSelect(tagId: string | null, tagGroup: string | null) {
    const groupName = tagGroup ?? "";
    const params = buildGroupParams(groupName, tagId);
    router.push(`/explore?${params.toString()}`);
  }

  function handleClearGroup(groupName: string) {
    const params = buildGroupParams(groupName, null);
    params.delete("tagGroup");
    router.push(`/explore?${params.toString()}`);
  }

  function handleClearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tagId");
    params.delete("tagGroup");
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <TagFilterRowBase
      tagGroups={tagGroups}
      selectedTagIds={searchParams.getAll("tagId")}
      selectedTagGroup={searchParams.get("tagGroup")}
      onSelect={handleSelect}
      onClearAll={handleClearAll}
      onClearGroup={handleClearGroup}
      variant="default"
    />
  );
}
