"use client";

import { TopicFilterRow as TopicFilterRowBase, type Level0Topic } from "@/components/TopicFilterRow";

export type { Level0Topic };

interface Props {
  topics: Level0Topic[];
  selectedTopicId: string | null;
  onSelect: (id: string | null) => void;
}

export function MapTopicFilterRow({ topics, selectedTopicId, onSelect }: Props) {
  function handleNavigate(_level0Id: string, topicId: string | null) {
    // 같은 토픽을 다시 선택하면 토글 해제
    if (topicId !== null && topicId === selectedTopicId) {
      onSelect(null);
    } else {
      onSelect(topicId);
    }
  }

  return (
    <TopicFilterRowBase
      topics={topics}
      selectedTopicIds={selectedTopicId ? [selectedTopicId] : []}
      onNavigate={handleNavigate}
      onClearAll={() => onSelect(null)}
      variant="map"
    />
  );
}
