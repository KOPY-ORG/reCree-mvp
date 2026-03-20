"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { labelBackground, badgeRingStyle, resolveTagColors } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { AllBadge } from "@/components/AllBadge";

type Tag = {
  id: string;
  name: string;
  colorHex: string | null;
  colorHex2?: string | null;
  textColorHex: string | null;
};

type TagGroup = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: Tag[];
};

interface Props {
  tagGroups: TagGroup[];
  selectedTagId: string | null;
  selectedTagGroup: string | null;
  onSelectTag: (tagId: string | null, tagGroup: string | null) => void;
}

export function MapTagFilterRow({ tagGroups, selectedTagId, selectedTagGroup, onSelectTag }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const openGroupData = openGroup ? tagGroups.find((g) => g.group === openGroup) : null;

  function getGroupSelection(groupName: string): string | null {
    const group = tagGroups.find((g) => g.group === groupName);
    return group?.tags.find((t) => t.id === selectedTagId)?.id ?? null;
  }

  function isGroupActive(groupName: string): boolean {
    return !!getGroupSelection(groupName) || selectedTagGroup === groupName;
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-1 pb-2 [--pill-py:0.375rem]">
        <button
          onClick={() => onSelectTag(null, null)}
          className={`pill-badge shrink-0 border transition-colors shadow-md ${
            !selectedTagId && !selectedTagGroup
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:text-foreground"
          }`}
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
              className={`pill-badge shrink-0 border transition-colors shadow-md ${
                isArirang
                  ? ""
                  : isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
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
                    onSelectTag(null, null);
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
                    onSelectTag(null, openGroupData.group);
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
                      onSelectTag(tag.id, openGroupData.group);
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
