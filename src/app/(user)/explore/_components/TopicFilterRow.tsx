"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ChildTopic = {
  id: string;
  nameEn: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
};

type Level0Topic = ChildTopic & {
  children: ChildTopic[];
};

export function TopicFilterRow({ topics }: { topics: Level0Topic[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId");
  const [openId, setOpenId] = useState<string | null>(null);

  // 선택된 topicId가 속한 Level 0 Topic 찾기
  const activeLevel0 = topics.find(
    (t) => t.id === topicId || t.children.some((c) => c.id === topicId)
  );
  const openTopic = openId ? topics.find((t) => t.id === openId) : null;

  function navigate(newTopicId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (newTopicId) {
      params.set("topicId", newTopicId);
    } else {
      params.delete("topicId");
    }
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
    setOpenId(null);
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
        <button
          onClick={() => navigate(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !topicId
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        {topics.map((topic) => {
          const isActive = activeLevel0?.id === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => {
                if (topic.children.length > 0) {
                  setOpenId(topic.id);
                } else {
                  navigate(topic.id);
                }
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "border-transparent"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: topic.colorHex ?? "#C8FF09",
                      color: topic.textColorHex ?? "#000000",
                    }
                  : undefined
              }
            >
              {topic.nameEn}
            </button>
          );
        })}
      </div>

      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[70vh] pb-8"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">{openTopic?.nameEn}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 px-4 pb-2 overflow-y-auto">
            <button
              onClick={() => navigate(openTopic?.id ?? null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                topicId === openTopic?.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              All {openTopic?.nameEn}
            </button>

            {openTopic?.children.map((child) => {
              const isActive = topicId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => navigate(child.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "border-transparent"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor:
                            child.colorHex ?? openTopic.colorHex ?? "#C8FF09",
                          color:
                            child.textColorHex ??
                            openTopic.textColorHex ??
                            "#000000",
                        }
                      : undefined
                  }
                >
                  {child.nameEn}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
