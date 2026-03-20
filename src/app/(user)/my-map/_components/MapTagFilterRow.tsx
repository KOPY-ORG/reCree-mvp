"use client";

import { TagFilterRow as TagFilterRowBase, type TagGroupForFilter } from "@/components/TagFilterRow";

export type { TagGroupForFilter as TagGroup };

interface Props {
  tagGroups: TagGroupForFilter[];
  selectedTagId: string | null;
  selectedTagGroup: string | null;
  onSelectTag: (tagId: string | null, tagGroup: string | null) => void;
}

export function MapTagFilterRow({ tagGroups, selectedTagId, selectedTagGroup, onSelectTag }: Props) {
  return (
    <TagFilterRowBase
      tagGroups={tagGroups}
      selectedTagIds={selectedTagId ? [selectedTagId] : []}
      selectedTagGroup={selectedTagGroup}
      onSelect={onSelectTag}
      onClearAll={() => onSelectTag(null, null)}
      onClearGroup={() => onSelectTag(null, null)}
      variant="map"
    />
  );
}
