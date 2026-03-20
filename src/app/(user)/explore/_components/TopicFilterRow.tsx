"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TopicFilterRow as TopicFilterRowBase, isTopicInGroup, type Level0Topic } from "@/components/TopicFilterRow";

export type { Level0Topic };

export function TopicFilterRow({ topics }: { topics: Level0Topic[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleNavigate(level0Id: string, topicId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const current = searchParams.getAll("topicId");
    params.delete("topicId");
    for (const id of current) {
      if (!isTopicInGroup(topics, level0Id, id)) params.append("topicId", id);
    }
    if (topicId) params.append("topicId", topicId);
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
  }

  function handleClearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("topicId");
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <TopicFilterRowBase
      topics={topics}
      selectedTopicIds={searchParams.getAll("topicId")}
      onNavigate={handleNavigate}
      onClearAll={handleClearAll}
      variant="default"
    />
  );
}
