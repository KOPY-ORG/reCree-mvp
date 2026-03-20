"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { labelBackground, badgeRingStyle, resolveTagColors } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { AllBadge } from "@/components/AllBadge";

export type TagForFilter = {
  id: string;
  name: string;
  colorHex: string | null;
  colorHex2?: string | null;
  textColorHex: string | null;
};

export type TagGroupForFilter = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: TagForFilter[];
};

interface Props {
  tagGroups: TagGroupForFilter[];
  /** URL 모드: 현재 선택된 tagId 목록. 컨트롤 모드: [selectedTagId].filter(Boolean) */
  selectedTagIds: string[];
  /** 그룹 전체 선택 상태 (URL: tagGroup param, 컨트롤: selectedTagGroup prop) */
  selectedTagGroup: string | null;
  /** 태그/그룹 선택 시 호출. tagId=null이면 그룹 전체 선택 */
  onSelect: (tagId: string | null, tagGroup: string | null) => void;
  /** 메인 All 버튼 클릭 */
  onClearAll: () => void;
  /** 그룹 chip의 X 버튼 클릭 (해당 그룹 선택 해제) */
  onClearGroup: (groupName: string) => void;
  /** "default": explore 스타일, "map": 지도 필터 스타일(shadow-md, bg-background) */
  variant?: "default" | "map";
}

export function TagFilterRow({
  tagGroups,
  selectedTagIds,
  selectedTagGroup,
  onSelect,
  onClearAll,
  onClearGroup,
  variant = "default",
}: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const isMap = variant === "map";
  const openGroupData = openGroup ? tagGroups.find((g) => g.group === openGroup) : null;

  function getGroupSelection(groupName: string): string | null {
    const group = tagGroups.find((g) => g.group === groupName);
    return selectedTagIds.find((id) => group?.tags.some((t) => t.id === id)) ?? null;
  }

  function isGroupActive(groupName: string): boolean {
    return !!getGroupSelection(groupName) || selectedTagGroup === groupName;
  }

  const pillBaseClass = `pill-badge shrink-0 border transition-colors${isMap ? " shadow-md" : ""}`;
  const activeChipClass = "bg-foreground text-background border-foreground";
  const inactiveChipClass = isMap
    ? "bg-background text-muted-foreground border-border hover:text-foreground"
    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground";
  const pillPy = isMap ? "[--pill-py:0.375rem]" : "[--pill-py:0.25rem]";
  const containerPt = isMap ? "pt-1" : "pt-2";

  const isAllActive = selectedTagIds.length === 0 && !selectedTagGroup;

  return (
    <>
      <div className={`flex gap-2 overflow-x-auto scrollbar-hide px-4 ${containerPt} pb-2 ${pillPy}`}>
        <button
          onClick={onClearAll}
          className={`${pillBaseClass} ${isAllActive ? activeChipClass : inactiveChipClass}`}
        >
          All
        </button>

        {tagGroups.map((group) => {
          const selectedId = getGroupSelection(group.group);
          const isActive = isGroupActive(group.group);
          const activeTag = group.tags.find((t) => t.id === selectedId);
          const label = activeTag ? `${group.nameEn} / ${activeTag.name}` : group.nameEn;

          const isArirang = group.nameEn === "ARIRANG";
          return (
            <button
              key={group.group}
              onClick={() => setOpenGroup(group.group)}
              className={`${pillBaseClass} ${
                isArirang
                  ? ""
                  : isActive
                  ? activeChipClass
                  : inactiveChipClass
              }`}
              style={isArirang ? {
                backgroundColor: group.colorHex,
                color: "#ffffff",
                borderColor: group.colorHex,
              } : undefined}
            >
              {label}
              {isActive ? (
                <X
                  className="size-3 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearGroup(group.group);
                  }}
                />
              ) : (
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!openGroup} onOpenChange={(v) => !v && setOpenGroup(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[80vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">{openGroupData?.nameEn}</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">{openGroupData?.nameEn}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 [--pill-py:0.25rem]">
            <div className="flex flex-wrap gap-2">
              <AllBadge
                onClick={() => {
                  if (openGroupData) {
                    onSelect(null, openGroupData.group);
                    setOpenGroup(null);
                  }
                }}
                active={!!(openGroupData && !getGroupSelection(openGroupData.group) && selectedTagGroup === openGroupData.group)}
                className="shrink-0"
              />

              {openGroupData?.tags.map((tag) => {
                const isActive = getGroupSelection(openGroupData.group) === tag.id;
                return (
                  <LabelBadge
                    key={tag.id}
                    as="button"
                    text={tag.name}
                    background={labelBackground({ text: "", ...resolveTagColors(tag, openGroupData) })}
                    color={resolveTagColors(tag, openGroupData).textColorHex}
                    className="shrink-0 transition-all active:opacity-70"
                    style={badgeRingStyle(tag.colorHex ?? openGroupData.colorHex, isActive)}
                    onClick={() => {
                      onSelect(tag.id, openGroupData.group);
                      setOpenGroup(null);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
