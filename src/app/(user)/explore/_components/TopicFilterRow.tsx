"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { labelBackground, DEFAULT_COLOR, DEFAULT_TEXT } from "@/lib/post-labels";
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
  const topicId = searchParams.get("topicId");

  const [openId, setOpenId] = useState<string | null>(null);
  const [activeL1Id, setActiveL1Id] = useState<string | null>(null);
  const [activeL2Id, setActiveL2Id] = useState<string | null>(null);

  const activeLevel0 = topics.find(
    (t) =>
      t.id === topicId ||
      t.children.some(
        (l1) =>
          l1.id === topicId ||
          l1.children.some(
            (l2) =>
              l2.id === topicId || l2.children.some((l3) => l3.id === topicId)
          )
      )
  );

  // 선택된 topicId의 표시 레이블 ("K-POP / BTS" 형태)
  function getSelectedLabel(t0: Level0Topic): string {
    if (!topicId || t0.id === topicId) return t0.nameEn;
    for (const l1 of t0.children) {
      if (l1.id === topicId) return `${t0.nameEn} / ${l1.nameEn}`;
      for (const l2 of l1.children) {
        if (l2.id === topicId) return `${t0.nameEn} / ${l2.nameEn}`;
        for (const l3 of l2.children) {
          if (l3.id === topicId) return `${t0.nameEn} / ${l3.nameEn}`;
        }
      }
    }
    return t0.nameEn;
  }

  // 선택된 토픽의 배경(단색/그라데이션)과 텍스트 색상

  const openTopic = openId ? topics.find((t) => t.id === openId) : null;
  const resolvedL1Id = activeL1Id ?? openTopic?.children[0]?.id ?? null;
  const activeL1 =
    openTopic?.children.find((c) => c.id === resolvedL1Id) ?? null;
  const activeL2 =
    activeL2Id
      ? (activeL1?.children.find((c) => c.id === activeL2Id) ?? null)
      : null;

  // 시트 열 때 현재 topicId에 해당하는 L1/L2 상태 복원
  function openSheet(id: string) {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;

    let restoredL1Id = topic.children[0]?.id ?? null;
    let restoredL2Id: string | null = null;

    if (topicId) {
      outer: for (const l1 of topic.children) {
        if (l1.id === topicId) {
          restoredL1Id = l1.id;
          break;
        }
        for (const l2 of l1.children) {
          if (l2.id === topicId) {
            restoredL1Id = l1.id;
            restoredL2Id = l2.id;
            break outer;
          }
          for (const l3 of l2.children) {
            if (l3.id === topicId) {
              restoredL1Id = l1.id;
              restoredL2Id = l2.id;
              break outer;
            }
          }
        }
      }
    }

    setOpenId(id);
    setActiveL1Id(restoredL1Id);
    setActiveL2Id(restoredL2Id);
  }

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

  // 글자색: 자체 textColorHex 없으면 조상 순서대로 탐색
  function topicFg(t: TopicBase, ...ancestors: (TopicBase | null | undefined)[]): string {
    const chain = [t, ...ancestors].filter(Boolean) as TopicBase[];
    return chain.find((a) => a.textColorHex)?.textColorHex ?? DEFAULT_TEXT;
  }

  // TopicBase → labelBackground 문자열 (단색/그라데이션 통일)
  // 자체 색 없으면 ancestors 순서대로 올라가며 첫 번째 색상 사용
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

  // box-shadow 기반 ring (dynamic color용, 단색 기준)
  function ringStyle(color: string | null, active: boolean) {
    if (!active || !color) return {};
    return { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${color}` };
  }

  return (
    <>
      {/* Level 0 칩 행 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
        <button
          onClick={() => navigate(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            !topicId
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        {topics.map((topic) => {
          const isActive = activeLevel0?.id === topic.id;
          const label = isActive ? getSelectedLabel(topic) : topic.nameEn;
          return (
            <button
              key={topic.id}
              onClick={() => {
                if (topic.children.length > 0) {
                  openSheet(topic.id);
                } else {
                  navigate(topic.id);
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
                    navigate(null);
                  }}
                />
              ) : (
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      {/* 바텀 시트 */}
      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[80vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">{openTopic?.nameEn}</SheetTitle>

          {/* 드래그 핸들 */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* 헤더 */}
          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">{openTopic?.nameEn}</p>
          </div>

          {/* Level 1 언더라인 탭 */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-border shrink-0">
            {openTopic?.children.map((l1) => {
              const isActive = l1.id === resolvedL1Id;
              const accentColor = l1.colorHex ?? openTopic?.colorHex ?? "#000000";
              return (
                <button
                  key={l1.id}
                  onClick={() => {
                    setActiveL1Id(l1.id);
                    setActiveL2Id(null);
                  }}
                  className="shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap active:opacity-70"
                  style={{
                    color: isActive ? accentColor : undefined,
                    borderBottomColor: isActive ? accentColor : "transparent",
                  }}
                >
                  <span className={isActive ? "" : "text-muted-foreground"}>
                    {l1.nameEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 스크롤 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            {activeL1 && (
              <div className="px-4 pt-4 pb-6 space-y-4">
                {/* Level 2 그룹 칩 */}
                <div className="flex flex-wrap gap-2">
                  {/* All [L1] 버튼 */}
                  <button
                    onClick={() => navigate(activeL1.id)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      topicId === activeL1.id
                        ? "bg-foreground text-background border-foreground"
                        : "border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground active:opacity-70"
                    }`}
                  >
                    All {activeL1.nameEn}
                  </button>

                  {activeL1.children.map((l2) => {
                    const isSelected = activeL2Id === l2.id;
                    const isNavigated = topicId === l2.id;
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
                        style={{ ...ringStyle(l2.colorHex ?? activeL1?.colorHex ?? openTopic?.colorHex, highlight) }}
                        onClick={() => {
                          if (hasChildren) {
                            setActiveL2Id(isSelected ? null : l2.id);
                          } else {
                            navigate(l2.id);
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

                {/* Level 3 멤버 패널 */}
                {activeL2 && activeL2.children.length > 0 && (
                  <div className="rounded-2xl bg-muted/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: topicBg(activeL2, activeL1, openTopic),
                        }}
                      />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {activeL2.nameEn}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* All [L2] 버튼 */}
                      <button
                        onClick={() => navigate(activeL2.id)}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          topicId === activeL2.id
                            ? "bg-foreground text-background border-foreground"
                            : "border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground active:opacity-70"
                        }`}
                      >
                        All
                      </button>

                      {activeL2.children.map((l3) => {
                        const fg = topicFg(l3, activeL2, activeL1, openTopic);
                        const isActive = topicId === l3.id;
                        return (
                          <LabelBadge
                            key={l3.id}
                            as="button"
                            text={l3.nameEn}
                            background={topicBg(l3, activeL2, activeL1, openTopic)}
                            color={fg}
                            className="shrink-0 px-3 py-1 transition-all active:opacity-70"
                            style={ringStyle(l3.colorHex ?? activeL2.colorHex ?? activeL1?.colorHex ?? openTopic?.colorHex, isActive)}
                            onClick={() => navigate(l3.id)}
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
