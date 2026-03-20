"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TopicFilterRow as TopicFilterRowBase, type Level0Topic } from "@/components/TopicFilterRow";

export type { Level0Topic };

export function TopicFilterRow({ topics }: { topics: Level0Topic[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function isInGroup(topics: Level0Topic[], level0Id: string, topicId: string): boolean {
    const group = topics.find((t) => t.id === level0Id);
    if (!group) return false;
    if (group.id === topicId) return true;
    for (const l1 of group.children) {
      if (l1.id === topicId) return true;
      for (const l2 of l1.children) {
        if (l2.id === topicId) return true;
        for (const l3 of l2.children) {
          if (l3.id === topicId) return true;
        }
      }
    }
    return false;
  }

  function handleNavigate(level0Id: string, topicId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const current = searchParams.getAll("topicId");
    params.delete("topicId");
    for (const id of current) {
      if (!isInGroup(topics, level0Id, id)) params.append("topicId", id);
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
