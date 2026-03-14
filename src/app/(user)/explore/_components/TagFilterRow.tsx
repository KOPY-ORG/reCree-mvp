"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { labelBackground, badgeRingStyle, resolveTagColors, DEFAULT_TEXT } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

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

export function TagFilterRow({ tagGroups }: { tagGroups: TagGroup[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagIds = searchParams.getAll("tagId");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const openGroupData = openGroup ? tagGroups.find((g) => g.group === openGroup) : null;

  function getGroupSelection(groupName: string): string | null {
    const group = tagGroups.find((g) => g.group === groupName);
    return tagIds.find((id) => group?.tags.some((t) => t.id === id)) ?? null;
  }

  function navigateGroup(groupName: string, newTagId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const group = tagGroups.find((g) => g.group === groupName);
    const groupTagIds = new Set(group?.tags.map((t) => t.id) ?? []);
    const current = searchParams.getAll("tagId");
    params.delete("tagId");
    for (const id of current) {
      if (!groupTagIds.has(id)) params.append("tagId", id);
    }
    if (newTagId) params.append("tagId", newTagId);
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
    setOpenGroup(null);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tagId");
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
  }

  function tagBg(tag: Tag, group: TagGroup): string {
    const resolved = resolveTagColors(tag, group);
    return labelBackground({ text: "", ...resolved });
  }

  function tagFg(tag: Tag, group: TagGroup): string {
    return tag.textColorHex ?? group.textColorHex ?? DEFAULT_TEXT;
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
        <button
          onClick={clearAll}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            tagIds.length === 0
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        {tagGroups.map((group) => {
          const selectedTagId = getGroupSelection(group.group);
          const isActive = !!selectedTagId;
          const activeTag = group.tags.find((t) => t.id === selectedTagId);
          const label = isActive && activeTag ? `${group.nameEn} / ${activeTag.name}` : group.nameEn;

          return (
            <button
              key={group.group}
              onClick={() => setOpenGroup(group.group)}
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
                    navigateGroup(group.group, null);
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

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openGroupData && navigateGroup(openGroupData.group, null)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  openGroupData && !getGroupSelection(openGroupData.group)
                    ? "bg-foreground text-background border-foreground"
                    : "border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground active:opacity-70"
                }`}
              >
                All
              </button>

              {openGroupData?.tags.map((tag) => {
                const isActive = getGroupSelection(openGroupData.group) === tag.id;
                return (
                  <LabelBadge
                    key={tag.id}
                    as="button"
                    text={tag.name}
                    background={tagBg(tag, openGroupData)}
                    color={tagFg(tag, openGroupData)}
                    className="shrink-0 px-3 py-1 transition-all active:opacity-70"
                    style={badgeRingStyle(tag.colorHex ?? openGroupData.colorHex, isActive)}
                    onClick={() => navigateGroup(openGroupData.group, tag.id)}
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
