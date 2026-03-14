"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { labelBackground, badgeRingStyle, DEFAULT_COLOR, DEFAULT_TEXT } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

type TopicBase = {
  id: string;
  nameEn: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
};

type Level3Topic = TopicBase;
type Level2Topic = TopicBase & { children: Level3Topic[] };
type Level1Topic = TopicBase & { children: Level2Topic[] };
type Level0Topic = TopicBase & { children: Level1Topic[] };

export function TopicFilterRow({ topics }: { topics: Level0Topic[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicIds = searchParams.getAll("topicId");

  const [openId, setOpenId] = useState<string | null>(null);
  const [activeL1Id, setActiveL1Id] = useState<string | null>(null);
  const [activeL2Id, setActiveL2Id] = useState<string | null>(null);

  // topicId가 해당 level0 그룹 소속인지 확인
  function isInGroup(level0Id: string, topicId: string): boolean {
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

  // 해당 그룹에서 현재 선택된 topicId
  function getGroupSelection(level0Id: string): string | null {
    return topicIds.find((id) => isInGroup(level0Id, id)) ?? null;
  }

  // 선택된 topicId의 표시 레이블 ("K-POP / BTS" 형태)
  function getSelectedLabel(t0: Level0Topic): string {
    const selected = getGroupSelection(t0.id);
    if (!selected || selected === t0.id) return t0.nameEn;
    for (const l1 of t0.children) {
      if (l1.id === selected) return `${t0.nameEn} / ${l1.nameEn}`;
      for (const l2 of l1.children) {
        if (l2.id === selected) return `${t0.nameEn} / ${l2.nameEn}`;
        for (const l3 of l2.children) {
          if (l3.id === selected) return `${t0.nameEn} / ${l3.nameEn}`;
        }
      }
    }
    return t0.nameEn;
  }

  const openTopic = openId ? topics.find((t) => t.id === openId) : null;
  const resolvedL1Id = activeL1Id ?? openTopic?.children[0]?.id ?? null;
  const activeL1 = openTopic?.children.find((c) => c.id === resolvedL1Id) ?? null;
  const activeL2 = activeL2Id ? (activeL1?.children.find((c) => c.id === activeL2Id) ?? null) : null;

  function openSheet(id: string) {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;

    const existingId = getGroupSelection(id);
    let restoredL1Id = topic.children[0]?.id ?? null;
    let restoredL2Id: string | null = null;

    if (existingId) {
      outer: for (const l1 of topic.children) {
        if (l1.id === existingId) { restoredL1Id = l1.id; break; }
        for (const l2 of l1.children) {
          if (l2.id === existingId) { restoredL1Id = l1.id; restoredL2Id = l2.id; break outer; }
          for (const l3 of l2.children) {
            if (l3.id === existingId) { restoredL1Id = l1.id; restoredL2Id = l2.id; break outer; }
          }
        }
      }
    }

    setOpenId(id);
    setActiveL1Id(restoredL1Id);
    setActiveL2Id(restoredL2Id);
  }

  // 해당 그룹의 선택만 교체
  function navigateGroup(level0Id: string, newTopicId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const current = searchParams.getAll("topicId");
    params.delete("topicId");
    for (const id of current) {
      if (!isInGroup(level0Id, id)) params.append("topicId", id);
    }
    if (newTopicId) params.append("topicId", newTopicId);
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
    setOpenId(null);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("topicId");
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
  }

  function topicFg(t: TopicBase, ...ancestors: (TopicBase | null | undefined)[]): string {
    const chain = [t, ...ancestors].filter(Boolean) as TopicBase[];
    return chain.find((a) => a.textColorHex)?.textColorHex ?? DEFAULT_TEXT;
  }

  function topicBg(t: TopicBase, ...ancestors: (TopicBase | null | undefined)[]): string {
    const chain = [t, ...ancestors].filter(Boolean) as TopicBase[];
    const source = chain.find((a) => a.colorHex) ?? null;
    const colorHex = source?.colorHex ?? DEFAULT_COLOR;
    const colorHex2 = source?.colorHex2 ?? null;
    const gradientDir = source?.gradientDir ?? "to bottom";
    const gradientStop = source?.gradientStop ?? 150;
    const textColorHex = t.textColorHex ?? source?.textColorHex ?? DEFAULT_TEXT;
    return labelBackground({ text: "", colorHex, colorHex2, gradientDir, gradientStop, textColorHex });
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-2">
        <button
          onClick={clearAll}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            topicIds.length === 0
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        {topics.map((topic) => {
          const isActive = topicIds.some((id) => isInGroup(topic.id, id));
          const label = isActive ? getSelectedLabel(topic) : topic.nameEn;
          return (
            <button
              key={topic.id}
              onClick={() => {
                if (topic.children.length > 0) {
                  openSheet(topic.id);
                } else {
                  navigateGroup(topic.id, topic.id);
                }
              }}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {label}
              {isActive ? (
                <X
                  className="size-3 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateGroup(topic.id, null);
                  }}
                />
              ) : (
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[80vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">{openTopic?.nameEn}</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">{openTopic?.nameEn}</p>
          </div>

          <div className="flex overflow-x-auto scrollbar-hide border-b border-border shrink-0">
            {openTopic?.children.map((l1) => {
              const isActive = l1.id === resolvedL1Id;
              const accentColor = l1.colorHex ?? openTopic?.colorHex ?? "#000000";
              return (
                <button
                  key={l1.id}
                  onClick={() => { setActiveL1Id(l1.id); setActiveL2Id(null); }}
                  className="shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap active:opacity-70"
                  style={{
                    color: isActive ? accentColor : undefined,
                    borderBottomColor: isActive ? accentColor : "transparent",
                  }}
                >
                  <span className={isActive ? "" : "text-muted-foreground"}>{l1.nameEn}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeL1 && (
              <div className="px-4 pt-4 pb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigateGroup(openTopic!.id, activeL1.id)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      getGroupSelection(openTopic!.id) === activeL1.id
                        ? "bg-foreground text-background border-foreground"
                        : "border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground active:opacity-70"
                    }`}
                  >
                    All {activeL1.nameEn}
                  </button>

                  {activeL1.children.map((l2) => {
                    const isSelected = activeL2Id === l2.id;
                    const isNavigated = getGroupSelection(openTopic!.id) === l2.id;
                    const highlight = isSelected || isNavigated;
                    const fg = topicFg(l2, activeL1, openTopic);
                    const hasChildren = l2.children.length > 0;

                    return (
                      <LabelBadge
                        key={l2.id}
                        as="button"
                        text={l2.nameEn}
                        background={topicBg(l2, activeL1, openTopic)}
                        color={fg}
                        className="shrink-0 px-3 py-1 transition-all active:opacity-70"
                        style={{ ...badgeRingStyle(l2.colorHex ?? activeL1?.colorHex ?? openTopic?.colorHex ?? null, highlight) }}
                        onClick={() => {
                          if (hasChildren) {
                            setActiveL2Id(isSelected ? null : l2.id);
                          } else {
                            navigateGroup(openTopic!.id, l2.id);
                          }
                        }}
                      >
                        {hasChildren &&
                          (isSelected ? (
                            <ChevronUp className="size-3.5 opacity-70" />
                          ) : (
                            <ChevronDown className="size-3.5 opacity-70" />
                          ))}
                      </LabelBadge>
                    );
                  })}
                </div>

                {activeL2 && activeL2.children.length > 0 && (
                  <div className="rounded-2xl bg-muted/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: topicBg(activeL2, activeL1, openTopic) }}
                      />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {activeL2.nameEn}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigateGroup(openTopic!.id, activeL2.id)}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          getGroupSelection(openTopic!.id) === activeL2.id
                            ? "bg-foreground text-background border-foreground"
                            : "border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground active:opacity-70"
                        }`}
                      >
                        All
                      </button>
                      {activeL2.children.map((l3) => {
                        const fg = topicFg(l3, activeL2, activeL1, openTopic);
                        const isActive = getGroupSelection(openTopic!.id) === l3.id;
                        return (
                          <LabelBadge
                            key={l3.id}
                            as="button"
                            text={l3.nameEn}
                            background={topicBg(l3, activeL2, activeL1, openTopic)}
                            color={fg}
                            className="shrink-0 px-3 py-1 transition-all active:opacity-70"
                            style={badgeRingStyle(l3.colorHex ?? activeL2.colorHex ?? activeL1?.colorHex ?? openTopic?.colorHex ?? null, isActive)}
                            onClick={() => navigateGroup(openTopic!.id, l3.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
